import os

import cv2
import numpy as np
import torch

from helper import (
    norm_img,
    get_cache_path_by_url,
    load_jit_model,
)
from base import InpaintModel
from schema import Config

LAMA_MODEL_URL = os.environ.get(
    "LAMA_MODEL_URL",
    "https://github.com/Sanster/models/releases/download/add_big_lama/big-lama.pt",
)


class LaMa(InpaintModel):
    name = "lama"
    pad_mod = 8

    def init_model(self, device, **kwargs):
        """
        Initialize the LaMa inpainting model with the given device and additional arguments.

        Args:
            device: The device to run the model on (e.g., 'cpu', 'cuda').
            kwargs: Additional arguments for model initialization.
        """
        self.model = load_jit_model(LAMA_MODEL_URL, device).eval()

    @staticmethod
    def is_downloaded() -> bool:
        """
        Check if the LaMa model is downloaded.

        Returns:
            bool: True if the model is downloaded, False otherwise.
        """
        return os.path.exists(get_cache_path_by_url(LAMA_MODEL_URL))

    def forward(self, image, mask, config: Config):
        """
        Perform inpainting on the given image and mask.

        Args:
            image: The input image as a numpy array (H, W, C) in RGB format.
            mask: The input mask as a numpy array (H, W) with 255 indicating the masked area.
            config: Configuration object for the inpainting process.

        Returns:
            numpy.ndarray: The inpainted image in BGR format.
        """
        try:
            image = norm_img(image)
            mask = norm_img(mask)

            mask = (mask > 0) * 1
            image = torch.from_numpy(image).unsqueeze(0).to(self.device)
            mask = torch.from_numpy(mask).unsqueeze(0).to(self.device)

            inpainted_image = self.model(image, mask)

            cur_res = inpainted_image[0].permute(1, 2, 0).detach().cpu().numpy()
            cur_res = np.clip(cur_res * 255, 0, 255).astype("uint8")
            cur_res = cv2.cvtColor(cur_res, cv2.COLOR_RGB2BGR)
            return cur_res
        except Exception as e:
            raise RuntimeError(f"Error during inpainting: {e}")
