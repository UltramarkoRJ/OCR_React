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
import { DataContext, DataProvider } from './Context/DataContext';

test('Menu component handles search click', async () => {
  const { getByText } = render(
    <DataProvider>
      <Menu />
    </DataProvider>
  );
  const searchIcon = getByText(/Load from URL/i);
  fireEvent.click(searchIcon);
  await waitFor(() => {
    expect(global.prompt).toHaveBeenCalled();
  });
});

test('Menu component renders without crashing', () => {
  const { getByText } = render(
    <DataProvider>
      <Menu />
    </DataProvider>
  );
  const searchIcon = getByText(/Load from URL/i);
  expect(searchIcon).toBeInTheDocument();
});

test('renders learn react link', () => {
  const { getByText } = render(<App />);
  const linkElement = getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
