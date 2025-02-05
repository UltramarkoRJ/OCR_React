import React from 'react';
import { createContext, useState } from "react";

export const DataProvider = ({ children }) => {
  const [imageText, setImageText] = useState([]);
  const [imageUrl, setImageUrl] = useState('');
  const [loader, setLoader] = useState(true);
  const [newImage, setNewImage] = useState('');
  const [oldImage, setOldImage] = useState('');

  return (
    <DataContext.Provider value={{ imageText, setImageText, imageUrl, setImageUrl, loader, setLoader, newImage, setNewImage, oldImage, setOldImage }}>
      {children}
    </DataContext.Provider>
  );
};

export const DataContext = createContext();
