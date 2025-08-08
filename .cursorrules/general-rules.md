# General Development Rules

## Code Quality
- Write clean, readable, and maintainable code
- Follow consistent naming conventions
- Use meaningful variable and function names
- Keep functions small and focused on a single responsibility
- Avoid code duplication (DRY principle)
- Write self-documenting code with clear comments where needed

## Documentation
- Document all public APIs and interfaces
- Keep README files up to date
- Document complex business logic
- Include setup and installation instructions
- Document environment variables and configuration options

## Version Control
- Make small, focused commits
- Write clear commit messages following the established format
- Use feature branches for new development
- Review code before merging
- Keep the main branch stable

## Testing
- Write tests for all new functionality
- Maintain existing test coverage
- Use descriptive test names
- Test both happy path and edge cases
- Mock external dependencies in unit tests

## Security
- Never commit sensitive information (passwords, API keys, etc.)
- Use environment variables for configuration
- Validate and sanitize all user inputs
- Follow security best practices for the technology stack
- Keep dependencies updated to patch security vulnerabilities

## Performance
- Profile code to identify bottlenecks
- Optimize database queries
- Use appropriate data structures and algorithms
- Implement caching where beneficial
- Monitor application performance in production

## Error Handling
- Implement proper error handling throughout the application
- Log errors with appropriate detail
- Provide meaningful error messages to users
- Handle edge cases gracefully
- Use try-catch blocks appropriately

## Code Review
- Review code for functionality, security, and performance
- Check for adherence to coding standards
- Ensure proper error handling
- Verify test coverage
- Look for potential security vulnerabilities 