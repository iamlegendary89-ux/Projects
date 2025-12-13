# SmartMatch PWA - Frontend

Welcome to the **SmartMatch** frontend codebase. This is a Next.js application built with a focus on high-fidelity aesthetics, smooth animations, and a unique "destiny-based" user experience.

## 🚀 Getting Started

### Prerequisites
- Node.js 18.17 or later
- npm or pnpm

### Installation
1.  Navigate to the project root.
2.  Install dependencies:
    ```bash
    npm install
    # or
    pnpm install
    ```

### Running Locally
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Building for Production
To create an optimized production build:
```bash
npm run build
npm start
```

## 📂 Project Structure

- **`app/`**: Contains the App Router pages and layouts.
    - `page.tsx`: Main entry point. Fetches phone data server-side.
    - `globals.css`: Defines the "Void" theme and CSS variables.
- **`components/SmartMatch/`**: The customized design system and feature components.
    - `screens/`: Logic for each step of the user journey (Landing, Quiz, Reveal).
    - `ParticleField.tsx`: The background visual effect.
- **`lib/`**: Utilities and business logic.
    - `SmartMatch.ts`: The core matching algorithm.
    - `phones.ts`: File-system data access (Server-side only).

## 🛠 Tech Stack & Tools

- **Styling**: Tailwind CSS. We use a custom configuration (`tailwind.config.js`) to define our "Soul" color palette (e.g., `text-soul-cyan`).
- **Animations**: Framer Motion. Used extensively for page transitions (`AnimatePresence`) and micro-interactions.
- **Icons**: Lucide React.

## 🎨 Design Guidelines

When contributing to the frontend, refer to `FRONTEND_SPEC.md` for detailed architectural constraints.

**Key Principles:**
1.  **"Void" Aesthetic**: Always use dark backgrounds (`bg-void-black`) with light text.
2.  **Glassmorphism**: Use `bg-white/5` or `bg-black/20` with `backdrop-blur` for containers.
3.  **Avoid Placeholders**: Do not check in "Lorem Ipsum". Use realistic fallback data or the `PhoneData` types.

## 🧪 Testing

Currently, the project focuses on visual fidelity.
To run the test suite (when implemented):
```bash
npm run test:unit
```
*Note: Unit tests are currently pending implementation.*

## 🤝 Contribution

1.  Create a feature branch.
2.  Ensure linting passes: `npm run qa:lint`.
3.  Submit a Pull Request.
