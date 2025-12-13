import "@testing-library/jest-dom";

// Mock problematic ESM imports
jest.mock("uuid", () => ({
  v5: jest.fn(() => "6ba7b810-9dad-11d1-80b4-00c04fd430c8")
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      upsert: jest.fn(() => Promise.resolve({ error: null })),
      delete: jest.fn(() => Promise.resolve({ error: null })),
      eq: jest.fn(() => ({ error: null }))
    }))
  }))
}));

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    ok: true,
    status: 200
  })
);

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: "/",
      query: "",
      asPath: "/"
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return "/";
  }
}));

// Mock environment variables
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_ANON_KEY = "test-anon-key";

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));
