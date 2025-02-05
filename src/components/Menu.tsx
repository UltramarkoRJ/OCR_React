import React, { useContext, useEffect, useState } from "react";
import { ReactComponent as Flip } from "../assets/rmback.svg";
import { ReactComponent as Draw } from "../assets/draw.svg";
import { ReactComponent as Text } from "../assets/text.svg";
import { ReactComponent as Search } from "../assets/search.svg";
import { ReactComponent as AutoTranslate } from "../assets/aa.svg";
import { ReactComponent as Translation } from "../assets/shapes.svg";

import Tooltip from "./Tooltip";
import useStore from "../hooks/useStore";
import { useObserver } from "mobx-react";
import { ModeName } from "../stores/canvasStore";
import { DataContext } from "../Context/DataContext";
interface IMenuItems {
  icon: React.ReactElement;
  name: ModeName;
  handler: () => void;
  tooltip?: string;
}
const baseURL = process.env.REACT_APP_BASE_URL;
const Menu = () => {
  const {
    imageText, setImageText, 
    imageUrl, setImageUrl, 
    loader, setLoader,
    setNewImage,
    setOldImage  
  } = useContext(DataContext);
  
  const { UIStore, canvasStore, imageStore } = useStore(); 
  
  const setImagePath = async() => {
    const url = String(imageUrl);
    await imageStore.load(url);
  }

  useEffect(() => {
    setImagePath();
  }, [imageUrl]);

  const handleClick = async (modeName: ModeName) => {
    if (!imageStore.url && modeName !== "search") {
      return;
    }

    UIStore.toggleToolbar(modeName);

    if (canvasStore.mode || canvasStore.scale !== 1) {
      if (canvasStore.mode !== "search") {
        canvasStore.setScale(1);
      }
    }

    if (!canvasStore.mode) {
      canvasStore.resetToBaseScale();
    }
  };

  const items: IMenuItems[] = [
    {
      icon: <Search />,
      name: "search",
      handler: () => loadFromAPI(),
      tooltip: "Load from URL",
    },
    {
      icon: <Draw />,
      name: "drawing",
      handler: () => handleClick("drawing"),
      tooltip: "Inpaint"
    },
    {
      icon: <Text />,
      name: "text",
      handler: () => handleClick("text"),
      tooltip: "Add Text"
    },
    {
      icon: <Translation />,
      name: "translate",
      handler: () => autoInpaint(),
      tooltip: "Translation"
    },
    {
      icon: <Flip />,
      name: "removeBG",
      handler: () => removeBG(),
      tooltip: "Remove Background"
    },
    {
      icon: <AutoTranslate />,
      name: "text",
      handler: () => autoTranslation(),
      tooltip: "Auto Translation"
    },
  ];

  const loadFromAPI = async () => {
    setLoader(false);
    const apiURL = prompt("Paste Image URL");
    const u = apiURL ? apiURL : "";
    const imageUrlData = await fetch(u);
    const buffer = await imageUrlData.arrayBuffer();
    const stringifiedBuffer = Buffer.from(buffer).toString('base64');
    const contentType = imageUrlData.headers.get('content-type');
    const imageBas64 = `data:image/${contentType};base64,${stringifiedBuffer}`;
    setLoader(true);
    setImageUrl(imageBas64);
    setOldImage(imageBas64);
    UIStore.canUndo = true;
    await imageStore.load(String(imageBas64));
  }

  const autoInpaint = async () => {
    if (!imageStore.url) return;
    setLoader(false);
    let responseData = await fetch(`${process.env.REACT_APP_BASE_URL}/autoinpaint`, {
      method: "POST",
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ image: imageStore.url })
    });
    const response = await responseData.json();
    setLoader(true);
    setImageUrl(response.image_base64);
    setNewImage(response.image_base64);
    UIStore.canUndo = true;
    setImageText(response.result);
  }

  const removeBG = async () => {
    if (!imageStore.url) return;
    setLoader(false);
    let responseData = await fetch(`${process.env.REACT_APP_BASE_URL}/removebg`, {
      method: "POST",
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ image: imageStore.url })
    });
    const response = await responseData.json();
    setLoader(true);
    setImageUrl(response.image_base64);
    setNewImage(response.image_base64);
    UIStore.canUndo = true;
  }

  const autoTranslation = async () => {
    if (!imageStore.url) return;
    setLoader(false);
    let responseData = await fetch(`${process.env.REACT_APP_BASE_URL}/autotranslation`, {
      method: "POST",
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ image: imageStore.url })
    });
    const response = await responseData.json();
    setLoader(true);
    setImageUrl(response.image_base64);
    setNewImage(response.image_base64);
    UIStore.canUndo = true;
  }

  const inpaint = async () => {
    if (!imageStore.url) return;
    let responseData = await fetch(`${process.env.REACT_APP_BASE_URL}/inpaint`, {
      method: "POST",
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ image: imageStore.url, mask: "mask here" })
    });
  }

  return useObserver(() => (
    <section className="menu">
      <div className="menu__wrapper">
        {items.map((item, index) => {
          const tooltip = item.tooltip || item.name;
          return (
            <Tooltip key={index} content={tooltip} placement="right">
              <abbr title={item.tooltip}>
                <div
                  className={`menu__item ${
                    canvasStore.mode === item.name ? "menu__item_active" : ""
                  } ${!imageStore.url && item.name !== "search" ? "disabled" : ""}
                  ${!loader ? "disabled" : ""}`}
                  onClick={loader ? item.handler : () => console.log("Loading...")}
                >
                  {item.icon}
                </div>
              </abbr>
            </Tooltip>
          );
        })}
      </div>
    </section>
  ));
};

export default Menu;
