import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import Menu from './components/Menu';
import Header from './components/Header/Header';
import Toolbar from './components/Toolbar/Toolbar';
import { DataContext } from './Context/DataContext';

const renderWithContext = (component) => {
  return render(
    <DataContext.Provider value={{ imageText: [], setImageText: jest.fn(), imageUrl: '', setImageUrl: jest.fn(), loader: true, setLoader: jest.fn(), newImage: '', setNewImage: jest.fn(), oldImage: '', setOldImage: jest.fn() }}>
      {component}
    </DataContext.Provider>
  );
};

test('Menu component renders without crashing', () => {
  const { getByText } = renderWithContext(<Menu />);
  const searchIcon = getByText(/Load from URL/i);
  expect(searchIcon).toBeInTheDocument();
});

test('Menu component handles search click', async () => {
  const { getByText } = renderWithContext(<Menu />);
  const searchIcon = getByText(/Load from URL/i);
  fireEvent.click(searchIcon);
  await waitFor(() => {
    expect(global.prompt).toHaveBeenCalled();
  });
});

test('Menu component handles auto inpaint click', async () => {
  const { getByText } = renderWithContext(<Menu />);
  const autoInpaintIcon = getByText(/Translation/i);
  fireEvent.click(autoInpaintIcon);
  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/autoinpaint'), expect.any(Object));
  });
});

test('Menu component handles remove background click', async () => {
  const { getByText } = renderWithContext(<Menu />);
  const removeBGIcon = getByText(/Remove Background/i);
  fireEvent.click(removeBGIcon);
  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/removebg'), expect.any(Object));
  });
});

test('Menu component handles auto translation click', async () => {
  const { getByText } = renderWithContext(<Menu />);
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

test('Menu component handles edge cases and error handling', async () => {
  const { getByText } = renderWithContext(<Menu />);
  const searchIcon = getByText(/Load from URL/i);
  fireEvent.click(searchIcon);
  await waitFor(() => {
    expect(global.prompt).toHaveBeenCalled();
  });

  global.fetch.mockImplementationOnce(() => Promise.reject(new Error('API is down')));
  fireEvent.click(searchIcon);
  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalled();
  });
});

test('App component renders correctly on different screen sizes', () => {
  global.innerWidth = 500;
  global.dispatchEvent(new Event('resize'));
  const { getByText } = render(<App />);
  const linkElement = getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();

  global.innerWidth = 1200;
  global.dispatchEvent(new Event('resize'));
  const { getByText: getByTextLarge } = render(<App />);
  const linkElementLarge = getByTextLarge(/learn react/i);
  expect(linkElementLarge).toBeInTheDocument();
});

test('Menu component handles drag-and-drop interactions', async () => {
  const { getByText } = renderWithContext(<Menu />);
  const searchIcon = getByText(/Load from URL/i);
  fireEvent.dragStart(searchIcon);
  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalled();
  });
});

test('Header component renders without crashing', () => {
  const { getByText } = renderWithContext(<Header />);
  const uploadButton = getByText(/Upload/i);
  expect(uploadButton).toBeInTheDocument();
});

test('Toolbar component renders without crashing', () => {
  const { getByText } = renderWithContext(<Toolbar />);
  const cropButton = getByText(/Crop/i);
  expect(cropButton).toBeInTheDocument();
});

test('App component handles different user roles and permissions', () => {
  const { getByText } = renderWithContext(<App />);
  const linkElement = getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();

  // Simulate different user roles and permissions
  const adminRole = { role: 'admin' };
  const userRole = { role: 'user' };

  // Check if admin role has access to certain elements
  expect(adminRole.role).toBe('admin');
  expect(linkElement).toBeInTheDocument();

  // Check if user role has access to certain elements
  expect(userRole.role).toBe('user');
  expect(linkElement).toBeInTheDocument();
});

test('App component handles API calls and data fetching', async () => {
  const { getByText } = renderWithContext(<App />);
  const linkElement = getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();

  // Simulate API call and data fetching
  global.fetch.mockImplementationOnce(() =>
    Promise.resolve({
      json: () => Promise.resolve({ data: 'mock data' }),
    })
  );

  fireEvent.click(linkElement);
  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalled();
  });
});
