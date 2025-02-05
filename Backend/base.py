import abc
from typing import Optional

import cv2
import torch
import numpy as np
from loguru import logger

from helper import boxes_from_mask, resize_max_size, pad_img_to_modulo, switch_mps_device
from schema import Config, HDStrategy


class InpaintModel:
    name = "base"
    min_size: Optional[int] = None
    pad_mod = 8
    pad_to_square = False

    def __init__(self, device, **kwargs):
        """
        Initialize the inpainting model with the given device and additional arguments.

        Args:
            device: The device to run the model on (e.g., 'cpu', 'cuda').
            kwargs: Additional arguments for model initialization.
        """
        device = switch_mps_device(self.name, device)
        self.device = device
        self.init_model(device, **kwargs)

    @abc.abstractmethod
    def init_model(self, device, **kwargs):
        """
        Abstract method to initialize the model. Must be implemented by subclasses.

        Args:
            device: The device to run the model on (e.g., 'cpu', 'cuda').
            kwargs: Additional arguments for model initialization.
        """
        ...

    @staticmethod
    @abc.abstractmethod
    def is_downloaded() -> bool:
        """
        Abstract method to check if the model is downloaded. Must be implemented by subclasses.

        Returns:
            bool: True if the model is downloaded, False otherwise.
        """
        ...

    @abc.abstractmethod
    def forward(self, image, mask, config: Config):
        """
        Abstract method to perform inpainting on the given image and mask. Must be implemented by subclasses.

        Args:
            image: The input image as a numpy array (H, W, C) in RGB format.
            mask: The input mask as a numpy array (H, W) with 255 indicating the masked area.
            config: Configuration object for the inpainting process.

        Returns:
            numpy.ndarray: The inpainted image in BGR format.
        """
        ...

    def _pad_forward(self, image, mask, config: Config):
        """
        Pad the input image and mask to the required size and perform inpainting.

        Args:
            image: The input image as a numpy array (H, W, C) in RGB format.
            mask: The input mask as a numpy array (H, W) with 255 indicating the masked area.
            config: Configuration object for the inpainting process.

        Returns:
            numpy.ndarray: The inpainted image in BGR format.
        """
        origin_height, origin_width = image.shape[:2]
        pad_image = pad_img_to_modulo(
            image, mod=self.pad_mod, square=self.pad_to_square, min_size=self.min_size
        )
        pad_mask = pad_img_to_modulo(
            mask, mod=self.pad_mod, square=self.pad_to_square, min_size=self.min_size
        )

        logger.info(f"final forward pad size: {pad_image.shape}")

        result = self.forward(pad_image, pad_mask, config)
        result = result[0:origin_height, 0:origin_width, :]

        result, image, mask = self.forward_post_process(result, image, mask, config)

        mask = mask[:, :, np.newaxis]
        result = result * (mask / 255) + image[:, :, ::-1] * (1 - (mask / 255))
        return result

    def forward_post_process(self, result, image, mask, config):
        """
        Post-process the inpainted result, image, and mask.

        Args:
            result: The inpainted result as a numpy array (H, W, C) in BGR format.
            image: The input image as a numpy array (H, W, C) in RGB format.
            mask: The input mask as a numpy array (H, W) with 255 indicating the masked area.
            config: Configuration object for the inpainting process.

        Returns:
            tuple: The post-processed result, image, and mask.
        """
        return result, image, mask

    @torch.no_grad()
    def __call__(self, image, mask, config: Config):
        """
        Perform inpainting on the given image and mask.

        Args:
            image: The input image as a numpy array (H, W, C) in RGB format.
            mask: The input mask as a numpy array (H, W) with 255 indicating the masked area.
            config: Configuration object for the inpainting process.

        Returns:
            numpy.ndarray: The inpainted image in BGR format.
        """
        inpaint_result = None
        logger.info(f"hd_strategy: {config.hd_strategy}")
        if config.hd_strategy == HDStrategy.CROP:
            if max(image.shape) > config.hd_strategy_crop_trigger_size:
                logger.info(f"Run crop strategy")
                boxes = boxes_from_mask(mask)
                crop_result = []
                for box in boxes:
                    crop_image, crop_box = self._run_box(image, mask, box, config)
                    crop_result.append((crop_image, crop_box))

                inpaint_result = image[:, :, ::-1]
                for crop_image, crop_box in crop_result:
                    x1, y1, x2, y2 = crop_box
                    inpaint_result[y1:y2, x1:x2, :] = crop_image

        elif config.hd_strategy == HDStrategy.RESIZE:
            if max(image.shape) > config.hd_strategy_resize_limit:
                origin_size = image.shape[:2]
                downsize_image = resize_max_size(
                    image, size_limit=config.hd_strategy_resize_limit
                )
                downsize_mask = resize_max_size(
                    mask, size_limit=config.hd_strategy_resize_limit
                )

                logger.info(
                    f"Run resize strategy, origin size: {image.shape} forward size: {downsize_image.shape}"
                )
                inpaint_result = self._pad_forward(
                    downsize_image, downsize_mask, config
                )

                # only paste masked area result
                inpaint_result = cv2.resize(
                    inpaint_result,
                    (origin_size[1], origin_size[0]),
                    interpolation=cv2.INTER_CUBIC,
                )
                original_pixel_indices = mask < 127
                inpaint_result[original_pixel_indices] = image[:, :, ::-1][
                    original_pixel_indices
                ]

        if inpaint_result is None:
            inpaint_result = self._pad_forward(image, mask, config)

        return inpaint_result

    def _crop_box(self, image, mask, box, config: Config):
        """
        Crop the input image and mask based on the given bounding box.

        Args:
            image: The input image as a numpy array (H, W, C) in RGB format.
            mask: The input mask as a numpy array (H, W) with 255 indicating the masked area.
            box: The bounding box as a list [left, top, right, bottom].
            config: Configuration object for the inpainting process.

        Returns:
            tuple: The cropped image, cropped mask, and the bounding box coordinates.
        """
        box_h = box[3] - box[1]
        box_w = box[2] - box[0]
        cx = (box[0] + box[2]) // 2
        cy = (box[1] + box[3]) // 2
        img_h, img_w = image.shape[:2]

        w = box_w + config.hd_strategy_crop_margin * 2
        h = box_h + config.hd_strategy_crop_margin * 2

        _l = cx - w // 2
        _r = cx + w // 2
        _t = cy - h // 2
        _b = cy + h // 2

        l = max(_l, 0)
        r = min(_r, img_w)
        t = max(_t, 0)
        b = min(_b, img_h)

        # try to get more context when crop around image edge
        if _l < 0:
            r += abs(_l)
        if _r > img_w:
            l -= _r - img_w
        if _t < 0:
            b += abs(_t)
        if _b > img_h:
            t -= _b - img_h

        l = max(l, 0)
        r = min(r, img_w)
        t = max(t, 0)
        b = min(b, img_h)

        crop_img = image[t:b, l:r, :]
        crop_mask = mask[t:b, l:r]

        logger.info(f"box size: ({box_h},{box_w}) crop size: {crop_img.shape}")

        return crop_img, crop_mask, [l, t, r, b]

    def _calculate_cdf(self, histogram):
        """
        Calculate the cumulative distribution function (CDF) from the given histogram.

        Args:
            histogram: The input histogram as a numpy array.

        Returns:
            numpy.ndarray: The normalized CDF.
        """
        cdf = histogram.cumsum()
        normalized_cdf = cdf / float(cdf.max())
        return normalized_cdf

    def _calculate_lookup(self, source_cdf, reference_cdf):
        """
        Calculate the lookup table for histogram matching.

        Args:
            source_cdf: The CDF of the source image.
            reference_cdf: The CDF of the reference image.

        Returns:
            numpy.ndarray: The lookup table.
        """
        lookup_table = np.zeros(256)
        lookup_val = 0
        for source_index, source_val in enumerate(source_cdf):
            for reference_index, reference_val in enumerate(reference_cdf):
                if reference_val >= source_val:
                    lookup_val = reference_index
                    break
            lookup_table[source_index] = lookup_val
        return lookup_table

    def _match_histograms(self, source, reference, mask):
        """
        Match the histograms of the source and reference images.

        Args:
            source: The source image as a numpy array (H, W, C).
            reference: The reference image as a numpy array (H, W, C).
            mask: The input mask as a numpy array (H, W) with 255 indicating the masked area.

        Returns:
            numpy.ndarray: The histogram-matched image.
        """
        transformed_channels = []
        for channel in range(source.shape[-1]):
            source_channel = source[:, :, channel]
            reference_channel = reference[:, :, channel]

            # only calculate histograms for non-masked parts
            source_histogram, _ = np.histogram(source_channel[mask == 0], 256, [0, 256])
            reference_histogram, _ = np.histogram(reference_channel[mask == 0], 256, [0, 256])

            source_cdf = self._calculate_cdf(source_histogram)
            reference_cdf = self._calculate_cdf(reference_histogram)

            lookup = self._calculate_lookup(source_cdf, reference_cdf)

            transformed_channels.append(cv2.LUT(source_channel, lookup))

        result = cv2.merge(transformed_channels)
        result = cv2.convertScaleAbs(result)

        return result

    def _apply_cropper(self, image, mask, config: Config):
        """
        Apply cropping to the input image and mask based on the configuration.

        Args:
            image: The input image as a numpy array (H, W, C) in RGB format.
            mask: The input mask as a numpy array (H, W) with 255 indicating the masked area.
            config: Configuration object for the inpainting process.

        Returns:
            tuple: The cropped image, cropped mask, and the bounding box coordinates.
        """
        img_h, img_w = image.shape[:2]
        l, t, w, h = (
            config.croper_x,
            config.croper_y,
            config.croper_width,
            config.croper_height,
        )
        r = l + w
        b = t + h

        l = max(l, 0)
        r = min(r, img_w)
        t = max(t, 0)
        b = min(b, img_h)

        crop_img = image[t:b, l:r, :]
        crop_mask = mask[t:b, l:r]
        return crop_img, crop_mask, (l, t, r, b)

    def _run_box(self, image, mask, box, config: Config):
        """
        Run the inpainting process on the cropped image and mask based on the bounding box.

        Args:
            image: The input image as a numpy array (H, W, C) in RGB format.
            mask: The input mask as a numpy array (H, W) with 255 indicating the masked area.
            box: The bounding box as a list [left, top, right, bottom].
            config: Configuration object for the inpainting process.

        Returns:
            tuple: The inpainted image and the bounding box coordinates.
        """
        crop_img, crop_mask, [l, t, r, b] = self._crop_box(image, mask, box, config)

        return self._pad_forward(crop_img, crop_mask, config), [l, t, r, b]


class DiffusionInpaintModel(InpaintModel):
    @torch.no_grad()
    def __call__(self, image, mask, config: Config):
        """
        Perform inpainting on the given image and mask using diffusion-based inpainting.

        Args:
            image: The input image as a numpy array (H, W, C) in RGB format.
            mask: The input mask as a numpy array (H, W) with 255 indicating the masked area.
            config: Configuration object for the inpainting process.

        Returns:
            numpy.ndarray: The inpainted image in BGR format.
        """
        # boxes = boxes_from_mask(mask)
        if config.use_croper:
            crop_img, crop_mask, (l, t, r, b) = self._apply_cropper(image, mask, config)
            crop_image = self._scaled_pad_forward(crop_img, crop_mask, config)
            inpaint_result = image[:, :, ::-1]
            inpaint_result[t:b, l:r, :] = crop_image
        else:
            inpaint_result = self._scaled_pad_forward(image, mask, config)

        return inpaint_result

    def _scaled_pad_forward(self, image, mask, config: Config):
        """
        Pad the input image and mask to the required size and perform inpainting using scaling.

        Args:
            image: The input image as a numpy array (H, W, C) in RGB format.
            mask: The input mask as a numpy array (H, W) with 255 indicating the masked area.
            config: Configuration object for the inpainting process.

        Returns:
            numpy.ndarray: The inpainted image in BGR format.
        """
        longer_side_length = int(config.sd_scale * max(image.shape[:2]))
        origin_size = image.shape[:2]
        downsize_image = resize_max_size(image, size_limit=longer_side_length)
        downsize_mask = resize_max_size(mask, size_limit=longer_side_length)
        logger.info(
            f"Resize image to do sd inpainting: {image.shape} -> {downsize_image.shape}"
        )
        inpaint_result = self._pad_forward(downsize_image, downsize_mask, config)
        # only paste masked area result
        inpaint_result = cv2.resize(
            inpaint_result,
            (origin_size[1], origin_size[0]),
            interpolation=cv2.INTER_CUBIC,
        )
        original_pixel_indices = mask < 127
        inpaint_result[original_pixel_indices] = image[:, :, ::-1][original_pixel_indices]
        return inpaint_result
