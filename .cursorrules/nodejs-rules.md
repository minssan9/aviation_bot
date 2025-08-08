# Node.js Development Rules (Aviation Bot)

## Project Structure
Based on the aviation bot project structure:
- Use modular architecture with clear separation of concerns
- Organize features in dedicated directories (features/, services/, providers/)
- Keep configuration separate in config/ directory
- Maintain database operations in database/ directory
- Use migrations for database schema changes

## Code Organization
- **app.js**: Main application entry point
- **bot.js**: Bot initialization and core logic
- **features/**: Feature-specific modules (commandHandlers, messageGenerator, scheduler, subscriberManager)
- **services/**: Business logic services (quizService, userService)
- **providers/**: External service integrations (aiProvider, anthropic, gemini)
- **database/**: Database connection and operations
- **migrations/**: Database schema versioning

## Best Practices
- Use ES6+ syntax and async/await for asynchronous operations
- Implement proper error handling with try-catch blocks
- Use environment variables for configuration
- Follow the single responsibility principle for each module
- Implement proper logging for debugging and monitoring
- Use TypeScript for better type safety (if applicable)

## Database Operations
- Use prepared statements to prevent SQL injection
- Implement connection pooling for better performance
- Handle database migrations systematically
- Use transactions for operations that modify multiple tables
- Implement proper backup strategies

## API Design
- Use RESTful principles for API endpoints
- Implement proper HTTP status codes
- Use consistent response formats
- Implement rate limiting for public endpoints
- Add proper authentication and authorization

## Security
- Validate all input data
- Sanitize user inputs
- Use HTTPS for all external communications
- Implement proper session management
- Follow OWASP security guidelines

## Testing
- Write unit tests for all business logic
- Implement integration tests for API endpoints
- Use mocking for external service dependencies
- Maintain good test coverage

## Performance
- Implement caching strategies where appropriate
- Use connection pooling for database operations
- Optimize database queries
- Implement proper error handling to prevent crashes 