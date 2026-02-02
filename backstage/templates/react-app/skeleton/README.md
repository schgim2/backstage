# ${{ values.name }}

${{ values.description }}

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:{% if values.buildTool == "vite" %}5173{% elif values.buildTool == "webpack" %}8080{% else %}3000{% endif %}`

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Page components{% if values.includeRouter %}
├── hooks/              # Custom React hooks{% endif %}{% if values.includeStateManagement != "none" %}
├── store/              # State management{% endif %}{% if values.includeAPI %}
├── services/           # API services{% endif %}{% if values.includeAuth %}
├── auth/               # Authentication logic{% endif %}
├── styles/             # Global styles
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
└── App.{% if values.useTypeScript %}tsx{% else %}jsx{% endif %}
```

## 🛠️ Available Scripts

{% if values.buildTool == "vite" %}
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
{% elif values.buildTool == "webpack" %}
- `npm run dev` - Start development server
- `npm run build` - Build for production
{% else %}
- `npm start` - Start development server
- `npm run build` - Build for production
{% endif %}
{% if values.testingFramework != "none" %}
- `npm test` - Run tests
{% if values.testingFramework == "vitest" %}
- `npm run test:ui` - Run tests with UI
{% elif values.testingFramework == "jest" %}
- `npm run test:watch` - Run tests in watch mode
{% endif %}
- `npm run test:coverage` - Run tests with coverage
{% endif %}
{% if values.includeE2E %}
- `npm run test:e2e` - Run end-to-end tests
{% endif %}
{% if values.includeESLint %}
- `npm run lint` - Lint code
- `npm run lint:fix` - Fix linting issues
{% endif %}
{% if values.includePrettier %}
- `npm run format` - Format code
{% endif %}
{% if values.includeStorybook %}
- `npm run storybook` - Start Storybook
{% endif %}

## 🏗️ Tech Stack

- **Framework**: React ${{ values.reactVersion }}
{% if values.useTypeScript %}
- **Language**: TypeScript
{% endif %}
- **Build Tool**: {% if values.buildTool == "vite" %}Vite{% elif values.buildTool == "webpack" %}Webpack{% else %}Create React App{% endif %}
{% if values.includeRouter %}
- **Routing**: React Router
{% endif %}
{% if values.includeStateManagement != "none" %}
- **State Management**: {% if values.includeStateManagement == "zustand" %}Zustand{% elif values.includeStateManagement == "redux-toolkit" %}Redux Toolkit{% else %}Context API{% endif %}
{% endif %}
{% if values.uiLibrary != "none" %}
- **UI Library**: {% if values.uiLibrary == "tailwind" %}Tailwind CSS{% elif values.uiLibrary == "material-ui" %}Material-UI{% elif values.uiLibrary == "chakra-ui" %}Chakra UI{% elif values.uiLibrary == "ant-design" %}Ant Design{% endif %}
{% endif %}
{% if values.testingFramework != "none" %}
- **Testing**: {% if values.testingFramework == "vitest" %}Vitest{% else %}Jest{% endif %} + React Testing Library
{% endif %}
{% if values.includeE2E %}
- **E2E Testing**: Playwright
{% endif %}
{% if values.includeESLint %}
- **Linting**: ESLint
{% endif %}
{% if values.includePrettier %}
- **Formatting**: Prettier
{% endif %}

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# API Configuration
{% if values.includeAPI %}
VITE_API_BASE_URL=http://localhost:8000/api
{% endif %}

# Authentication
{% if values.includeAuth and values.authProvider == "auth0" %}
VITE_AUTH0_DOMAIN=your-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
{% elif values.includeAuth and values.authProvider == "firebase" %}
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
{% elif values.includeAuth and values.authProvider == "supabase" %}
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
{% endif %}
```

{% if values.uiLibrary == "tailwind" %}
### Tailwind CSS

The project is configured with Tailwind CSS. You can customize the theme in `tailwind.config.js`.

{% endif %}
{% if values.includeDocker %}
### Docker

Build and run with Docker:

```bash
# Build image
docker build -t ${{ values.name }} .

# Run container
docker run -p 3000:3000 ${{ values.name }}
```

{% endif %}
## 🚀 Deployment

{% if values.deploymentTarget == "vercel" %}
### Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy automatically on every push

{% elif values.deploymentTarget == "netlify" %}
### Netlify

1. Build the project: `npm run build`
2. Deploy the `dist` folder to Netlify

{% elif values.deploymentTarget == "github-pages" %}
### GitHub Pages

1. Install gh-pages: `npm install --save-dev gh-pages`
2. Add deploy script to package.json: `"deploy": "gh-pages -d dist"`
3. Run: `npm run deploy`

{% elif values.deploymentTarget == "docker" %}
### Docker Deployment

Use the included Dockerfile to deploy to any container platform.

{% endif %}
## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you have any questions or need help, please:

1. Check the [documentation](./docs)
2. Search existing [issues](../../issues)
3. Create a new [issue](../../issues/new)

---

Built with ❤️ using React and modern web technologies.