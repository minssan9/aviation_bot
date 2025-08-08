# Frontend Development Rules

## Technology Stack
- TypeScript, Node.js, Vite, Vue.js, Vue Router, Pinia, VueUse and Chartjs
- Deep understanding of best practices and performance optimization techniques

## Code Style and Structure
- Write concise, maintainable, and technically accurate TypeScript code with relevant examples
- Use functional and declarative programming patterns; avoid classes
- Favor iteration and modularization to adhere to DRY principles and avoid code duplication
- Use descriptive variable names with auxiliary verbs (e.g., isLoading, hasError)
- Organize files systematically: each file should contain only related content
- Use components in src/components first of all
- Use style sheet in src/style
  - 모든 스타일 시트 통합하고 표준화해서 관리하고 싶어
  - extract and singlify, ingerate all style sheet in each .vue files
- Display data on the screen using sample data included within the page
- Structure in a way that makes it easy to replace with API calls later
- Fetching page object, response is composed like below:
  ```typescript
  rows.value = response.data.content;
  total.value = response.data.totalElements;
  ```

## Naming Conventions
- Use lowercase with dashes for directories (e.g., components/auth-wizard)
- Favor named exports for functions

## TypeScript Usage
- Use TypeScript for all code
- Prefer interfaces over types for their extendability and ability to merge
- Avoid enums; use maps instead for better type safety and flexibility
- Use functional components with TypeScript interfaces

## Syntax and Formatting
- Use the "function" keyword for pure functions to benefit from hoisting and clarity
- Always use the Vue Composition API script setup style

## UI and Styling
- Must Use Grid System of Design Framework to Compose UI Layout
- Use Quasar for components and styling
- Implement responsive design with Quasar, SCSS; use a mobile-first approach

## Performance Optimization
- Leverage VueUse functions where applicable to enhance reactivity and performance
- Wrap asynchronous components in Suspense with a fallback UI
- Use dynamic loading for non-critical components
- Optimize images: use WebP format, include size data, implement lazy loading
- Implement an optimized chunking strategy during the Vite build process
- Optimize Web Vitals (LCP, CLS, FID) using tools like Lighthouse or WebPageTest 