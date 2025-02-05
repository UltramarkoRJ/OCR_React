import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import Menu from './components/Menu';
import { DataContext } from './Context/DataContext';

test('Menu component renders without crashing', () => {
  const { getByText } = render(
    <DataContext.Provider value={{ imageText: [], setImageText: jest.fn(), imageUrl: '', setImageUrl: jest.fn(), loader: true, setLoader: jest.fn(), newImage: '', setNewImage: jest.fn(), oldImage: '', setOldImage: jest.fn() }}>
      <Menu />
    </DataContext.Provider>
  );
  const searchIcon = getByText(/Load from URL/i);
  expect(searchIcon).toBeInTheDocument();
});

test('Menu component handles search click', async () => {
  const { getByText } = render(
    <DataContext.Provider value={{ imageText: [], setImageText: jest.fn(), imageUrl: '', setImageUrl: jest.fn(), loader: true, setLoader: jest.fn(), newImage: '', setNewImage: jest.fn(), oldImage: '', setOldImage: jest.fn() }}>
      <Menu />
    </DataContext.Provider>
  );
  const searchIcon = getByText(/Load from URL/i);
  fireEvent.click(searchIcon);
  await waitFor(() => {
    expect(global.prompt).toHaveBeenCalled();
  });
});

test('Menu component handles auto inpaint click', async () => {
  const { getByText } = render(
    <DataContext.Provider value={{ imageText: [], setImageText: jest.fn(), imageUrl: '', setImageUrl: jest.fn(), loader: true, setLoader: jest.fn(), newImage: '', setNewImage: jest.fn(), oldImage: '', setOldImage: jest.fn() }}>
      <Menu />
    </DataContext.Provider>
  );
  const autoInpaintIcon = getByText(/Translation/i);
  fireEvent.click(autoInpaintIcon);
  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/autoinpaint'), expect.any(Object));
  });
});

test('Menu component handles remove background click', async () => {
  const { getByText } = render(
    <DataContext.Provider value={{ imageText: [], setImageText: jest.fn(), imageUrl: '', setImageUrl: jest.fn(), loader: true, setLoader: jest.fn(), newImage: '', setNewImage: jest.fn(), oldImage: '', setOldImage: jest.fn() }}>
      <Menu />
    </DataContext.Provider>
  );
  const removeBGIcon = getByText(/Remove Background/i);
  fireEvent.click(removeBGIcon);
  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/removebg'), expect.any(Object));
  });
});

test('Menu component handles auto translation click', async () => {
  const { getByText } = render(
    <DataContext.Provider value={{ imageText: [], setImageText: jest.fn(), imageUrl: '', setImageUrl: jest.fn(), loader: true, setLoader: jest.fn(), newImage: '', setNewImage: jest.fn(), oldImage: '', setOldImage: jest.fn() }}>
      <Menu />
    </DataContext.Provider>
  );
  const autoTranslationIcon = getByText(/Auto Translation/i);
  fireEvent.click(autoTranslationIcon);
  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/autotranslation'), expect.any(Object));
  });
});

test('renders learn react link', () => {
  const { getByText } = render(<App />);
  const linkElement = getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
