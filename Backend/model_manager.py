import torch
import gc

from helper import switch_mps_device
from lama import LaMa
from schema import Config

models = {
    "lama": LaMa
}


class ModelManager:
    def __init__(self, name: str, device: torch.device, **kwargs):
        """
        Initialize the ModelManager with the given model name, device, and additional arguments.

        Args:
            name (str): The name of the model.
            device (torch.device): The device to run the model on.
            kwargs: Additional arguments for model initialization.
        """
        self.name = name
        self.device = device
        self.kwargs = kwargs
        self.model = self.init_model(name, device, **kwargs)

    def init_model(self, name: str, device, **kwargs):
        """
        Initialize the model with the given name and device.

        Args:
            name (str): The name of the model.
            device (torch.device): The device to run the model on.
            kwargs: Additional arguments for model initialization.

        Returns:
            The initialized model.
        """
        if name in models:
            model = models[name](device, **kwargs)
        else:
            raise NotImplementedError(f"Not supported model: {name}")
        return model

    def is_downloaded(self, name: str) -> bool:
        """
        Check if the model with the given name is downloaded.

        Args:
            name (str): The name of the model.

        Returns:
            bool: True if the model is downloaded, False otherwise.
        """
        if name in models:
            return models[name].is_downloaded()
        else:
            raise NotImplementedError(f"Not supported model: {name}")

    def __call__(self, image, mask, config: Config):
        """
        Perform inpainting on the given image and mask using the model.

        Args:
            image: The input image as a numpy array (H, W, C) in RGB format.
            mask: The input mask as a numpy array (H, W) with 255 indicating the masked area.
            config: Configuration object for the inpainting process.

        Returns:
            numpy.ndarray: The inpainted image in BGR format.
        """
        try:
            return self.model(image, mask, config)
        except Exception as e:
            raise RuntimeError(f"Error during model call: {e}")

    def switch(self, new_name: str):
        """
        Switch to a new model with the given name.

        Args:
            new_name (str): The name of the new model.
        """
        if new_name == self.name:
            return
        try:
            if torch.cuda.memory_allocated() > 0:
                # Clear current loaded model from memory
                torch.cuda.empty_cache()
                del self.model
                gc.collect()

            self.model = self.init_model(
                new_name, switch_mps_device(new_name, self.device), **self.kwargs
            )
            self.name = new_name
        except NotImplementedError as e:
            raise e
