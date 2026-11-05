# Lienzo

A modern, open-source document builder built with Svelte 5, TypeScript, and Tailwind CSS. Create professional documents (resumes, invoices, letters, and more) with an intuitive drag-and-drop canvas interface, featuring advanced ruler boundaries and real-time editing capabilities.

![CI](https://github.com/Deityhub/lienzo/workflows/CI/badge.svg)
![PR Checks](https://github.com/Deityhub/lienzo/workflows/PR%20Checks/badge.svg)

## 🚀 Features

### Core Features

- **Drag-and-Drop Interface**: Intuitive canvas-based document creation with real-time preview
- **Multiple Element Types**: Text, shapes, and images with full customization
- **Real-time Editing**: Live preview with instant updates and inline text editing
- **Multi-page Support**: Create documents with unlimited pages
- **Nested Elements**: Elements can contain other elements (hierarchical structure)
- **UUID-based IDs**: Cryptographically secure unique identifiers for all elements
- **Versatile Use Cases**: Perfect for resumes, invoices, letters, certificates, and more

### Advanced Canvas Tools

- **Professional Ruler System**:
  - Horizontal and vertical rulers with tick marks (major, minor, tiny)
  - Draggable triangle markers for boundary adjustment
  - Real-time boundary visualization
- **Smart Element Positioning**:
  - Snap-to-grid with 10px threshold
  - Boundary enforcement (elements stay within defined areas)
  - Dynamic sizing based on drop position
  - Automatic element reparenting on drag

- **Advanced Resize Tool**:
  - 4 edge handles for width/height adjustment
  - 4 corner handles for proportional resize
  - Minimum size enforcement (20px)
  - Visual feedback with hover states

### Element Management

- **Text Elements**:
  - Inline contenteditable text
  - Font family, size, weight, and style customization
  - Color picker
  - Full typography control

- **Shape Elements**:
  - **Basic Shapes**: Rectangle, Circle, Ellipse, Triangle, Diamond, Hexagon, Pentagon
  - **Lines & Arrows**: Horizontal, Vertical, and Directional Arrows (up, down, left, right)
  - **Styling Options**:
    - Custom stroke color and width
    - Fill color with opacity control
    - Stroke styles: solid, dashed, or dotted
    - Corner radius for rectangles
    - Rotation support
  - **Use Cases**:
    - Visual dividers and section breaks
    - Decorative elements and icons
    - Flow charts and diagrams
    - Highlighting important content

- **Image Elements**:
  - URL-based image loading
  - Alt text support
  - Responsive sizing

### Visual Feedback System

- **Element Highlighting**:
  - Blue ring: Selected element
  - Yellow ring: Elements underneath (overlapping)
  - Green ring: Element being hovered during drag
  - Purple dashed outline: Drag preview
- **Drag Operations**:
  - Real-time drag preview
  - ESC key to cancel drag
  - Automatic cleanup on drag leave
  - Parent detection and highlighting

### Property Panel

- **Position & Size**: Precise X, Y, width, height controls
- **Typography**: Font family, size, weight, style, color
- **Shape Properties**: Type, stroke color, stroke width
- **Image Properties**: URL, alt text
- **Element Actions**: Delete button with confirmation

## 🛠️ Technology Stack

- **Framework**: Svelte 5 (SvelteKit)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Testing**: Vitest + Playwright
- **Code Quality**: ESLint + Prettier
- **Deployment**: Vercel, or Docker (GHCR and Docker Hub)

## 📋 Prerequisites

- **Node.js** 22 (see `.nvmrc`)
- **Yarn** 4 (run `corepack enable`; the version is pinned via `packageManager`)
- **Git**

## 🚀 Quick Start

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/lienzo.git
   cd lienzo
   ```

2. **Install dependencies**

   ```bash
   yarn install
   ```

3. **Start development server**

   ```bash
   yarn dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

### Build for Production

```bash
# Build the application
yarn build

# Preview production build
yarn preview
```

## 🎨 Key Components

### Canvas

The main canvas component that handles:

- Element rendering with zIndex sorting
- Drag-and-drop with real-time preview
- Boundary enforcement and snapping
- Ruler integration and visualization
- Element reparenting on drag
- Nested element flattening for display

### Ruler System

Professional boundary controls featuring:

- Horizontal and vertical rulers (Google Docs style)
- Draggable triangle markers (blue for start, red for end)
- Three-tier tick marks:
  - Major ticks (12px) every 100px
  - Minor ticks (8px) every 50px
  - Tiny ticks (4px) every 10px
- Real-time boundary updates with reactive effects
- Coordinate scaling for accurate positioning

### Property Panel

Comprehensive styling interface for:

- Position and dimensions (X, Y, width, height)
- Typography (7 font families, 12 font sizes)
- Font weight (normal, bold) and style (normal, italic)
- Color picker for text and shapes
- Element-specific properties
- Delete functionality

### Resize Tool

Advanced resize system with:

- **4 Edge Handles**: 60px × 4px bars for width/height
- **4 Corner Handles**: 12px circles for proportional resize
- **8 Resize Directions**: n, s, e, w, nw, ne, sw, se
- Visual feedback with hover states
- Boundary-aware resizing

## 🔧 Development

### Available Scripts

```bash
# Development
yarn dev              # Start development server
yarn dev -- --open    # Open browser automatically

# Building
yarn build           # Production build
yarn preview         # Preview production build

# Code Quality
yarn lint            # Run ESLint
yarn format          # Format code with Prettier
yarn check           # Type checking

# Testing
yarn test            # Run all tests
yarn test:unit       # Unit tests only
yarn test:e2e        # End-to-end tests
```

### Code Style

This project follows:

- **Prettier** for code formatting
- **ESLint** for linting
- **TypeScript** for type safety
- **Svelte 5** syntax and patterns

### Key Development Patterns

1. **State Management**: Uses Svelte 5 runes (`$state`, `$derived`)
2. **Component Architecture**: Functional components with clear props
3. **TypeScript**: Full type safety across the application
4. **Responsive Design**: Mobile-first approach with Tailwind CSS

## 🎯 Usage Guide

### Creating a Document

1. **Navigate to Builder**: Click "Start Building" from the homepage
2. **Add Elements**: Drag text, shapes, or images from the toolbar
3. **Customize Elements**: Select elements to edit properties in the panel
4. **Adjust Boundaries**: Drag ruler markers to set canvas boundaries
5. **Multi-page Support**: Add additional pages as needed
6. **Save & Export**: Save your document to locally or export as PDF

### Element Manipulation

- **Move**: Click and drag elements on the canvas
- **Resize**: Use corner handles on selected elements
- **Edit**: Select elements to modify properties in the panel
- **Delete**: Use the delete button in the property panel

### Boundary System

- **Set Boundaries**: Drag triangle markers on rulers
- **Snap-to-Grid**: Elements automatically align to boundaries
- **Boundary Enforcement**: Elements cannot move outside defined areas
- **Auto-constrain**: Elements automatically adjust when boundaries change

## 🧪 Testing

This project has comprehensive test coverage for most features.

### Unit Tests

```bash
yarn test:unit
```

**Test Coverage:**

- ✅ Page Management (create, delete, UUID generation)
- ✅ Ruler Boundaries (initialization, updates, validation)
- ✅ Element Management (add, update, delete, UUID generation)
- ✅ Element Selection (select, deselect)
- ✅ Nested Elements (parent-child relationships, finding, moving)
- ✅ zIndex Management (automatic assignment)
- ✅ Store State Management (reactive updates)

**Total Unit Tests**: 20+ tests covering all store functionality

### End-to-End Tests

```bash
yarn test:e2e
```

**Test Coverage:**

- ✅ Navigation (home, create, about pages)
- ✅ Page Management (add pages, page counter)
- ✅ Drag and Drop (text, shape, image elements)
- ✅ Element Selection (select, deselect)
- ✅ Element Manipulation (resize handles, delete)
- ✅ Property Updates (font size, font family)
- ✅ UI Components (toolbar, canvas, property panel, rulers)
- ✅ Boundary Visualization (rulers, boundary box)
- ✅ Multi-element Workflows (adding multiple elements)

**Total E2E Tests**: 14 comprehensive workflow tests

### Run All Tests

```bash
yarn test
```

This runs both unit and e2e tests sequentially.

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect Repository**: Link your GitHub repository to Vercel
2. **Automatic Deployments**: Every push to main branch triggers deployment
3. **Environment Variables**: Configure any required environment variables

### Docker

A multi-arch (amd64/arm64) image is published to GitHub Container Registry and Docker Hub on every release:

```bash
docker run -p 3000:3000 -e ORIGIN=http://localhost:3000 ghcr.io/deityhub/lienzo:latest
```

The same image is on Docker Hub as `deityhub/lienzo`. Pin a version with a tag instead of `latest` (e.g. `ghcr.io/deityhub/lienzo:1.1.0`). To build it yourself:

```bash
docker build -t lienzo .
docker compose up --build   # http://localhost:3000
```

| Variable | Default                  | Description                                                        |
| -------- | ------------------------ | ------------------------------------------------------------------ |
| `ORIGIN` | _(required for hosting)_ | Public URL the app is served from, e.g. `https://docs.example.com` |
| `PORT`   | `3000`                   | Port the server listens on                                         |
| `HOST`   | `0.0.0.0`                | Interface the server binds to                                      |

The image is built with `adapter-node` (`ADAPTER=node`); the default `yarn build` keeps targeting Vercel. Without Docker: `ADAPTER=node yarn build && node build`.

## 🤝 Contributing

We welcome contributions! Here's how to get involved:

### Getting Started

1. **Fork** the repository
2. **Clone** your fork
3. **Create** a feature branch: `git checkout -b feature/amazing-feature`
4. **Install** dependencies: `yarn install`
5. **Start** development: `yarn dev`

### Contribution Guidelines

1. **Code Style**: Follow existing patterns and run `yarn format`
2. **Tests**: Add tests for new features
3. **Documentation**: Update README for significant changes
4. **Pull Requests**: Use a [Conventional Commits](https://www.conventionalcommits.org/) title (e.g. `feat: add text alignment`, `fix: resize handle offset`). It is checked in CI and drives versioning

### Development Workflow

1. Create a feature branch
2. Make your changes
3. Add tests if applicable
4. Run the test suite: `yarn test`
5. Format code: `yarn format`
6. Submit a pull request

## 🏷️ Versioning & Releases

Lienzo follows [Semantic Versioning](https://semver.org/) and keeps a [CHANGELOG](CHANGELOG.md) generated from [Conventional Commits](https://www.conventionalcommits.org/). PRs are squash-merged into `develop` with a Conventional Commit title (`feat:`, `fix:`, `perf:`, `refactor:`, `docs:` appear in the changelog; `chore:`, `ci:`, `test:` etc. do not).

To cut a release:

1. **Prepare:** In GitHub, go to Actions → **Prepare Release** → Run workflow on `develop` and choose `patch`, `minor` or `major`. It opens a `chore(release): vX.Y.Z` PR into `develop` that bumps `package.json` and updates `CHANGELOG.md`.
2. **Merge** that PR into `develop`.
3. **Publish:** Open a PR from `develop` into `main` and merge it (use a merge commit so branches stay aligned). The **Release** workflow tags `vX.Y.Z` and creates the GitHub Release with the changelog notes.

The running version is shown in the landing page footer. To make CI run on the release PR, add a personal access token as the repo secret `RELEASE_TOKEN`.

## 📝 License

This project is open source and available under the [GNU GPLv3 License](LICENSE).

## 🙏 Acknowledgments

- Built with [Svelte 5](https://svelte.dev/) and [SvelteKit](https://svelte.dev/docs/kit)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Lucide Svelte](https://lucide.dev/)

## 📞 Support

- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Contributing**: See our contributing guidelines above

---

**Made with ❤️ by [Deityhub](https://github.com/Deityhub) - Create beautiful documents with ease**
