# Instagram Reels Automation Feature PRD

## Overview
Create an automated Instagram Reels generation and posting system that generates educational English content using Gemini API, converts it to visual content, and posts it directly to Instagram.

## Core Features

### 1. Text Generation with Gemini API
- **Input**: Use the prompt from `en9door_bot.md` to generate daily English word content
- **Output**: Structured text with word definition, pronunciation, examples, and hashtags
- **Requirements**:
  - Integrate with Google Gemini API
  - Follow the exact formatting specified in the prompt
  - Include pronunciation, definitions, Korean examples, and English translations
  - Add required hashtags and website link
  - Handle API rate limits and errors gracefully

### 2. Image Generation
- **Input**: Generated text content from Gemini API
- **Output**: Instagram-optimized image (1080x1920px for Reels)
- **Requirements**:
  - Create visually appealing text overlay on background
  - Use appropriate fonts and colors for readability
  - Include the word prominently as the main title
  - Add pronunciation, definition, and examples in organized layout
  - Ensure text is readable on mobile devices
  - Support Korean and English text rendering

### 3. Video Creation
- **Input**: Generated image and text content
- **Output**: 20-second Instagram Reels video
- **Requirements**:
  - Create smooth transitions and animations
  - Include text animations (fade in, slide effects)
  - Add background music or sound effects
  - Ensure video meets Instagram Reels specifications
  - Optimize for mobile viewing
  - Include proper aspect ratio (9:16)

### 4. Instagram API Integration
- **Input**: Generated video file
- **Output**: Posted Reels on Instagram account
- **Requirements**:
  - Authenticate with Instagram Graph API
  - Upload video to Instagram
  - Add caption with generated text content
  - Include hashtags and website link
  - Handle posting errors and retries
  - Schedule posts if needed

## Technical Requirements

### API Integrations
- Google Gemini API for text generation
- Instagram Graph API for posting
- Image generation library (Canvas, Sharp, or similar)
- Video creation library (FFmpeg, MoviePy, or similar)

### Data Storage
- Store generated content for backup and analytics
- Track posting history and engagement
- Store API credentials securely

### Error Handling
- Graceful handling of API failures
- Retry mechanisms for failed posts
- Logging and monitoring for debugging

### Security
- Secure storage of API keys
- Environment variable configuration
- Rate limiting to prevent API abuse

## User Interface
- Simple web interface for manual triggering
- Dashboard to view generated content and posting status
- Configuration panel for API keys and settings

## Success Metrics
- Successful daily post generation
- Instagram engagement rates
- API reliability and uptime
- Content quality and consistency

## Constraints
- Instagram API rate limits
- Gemini API usage limits
- Video file size restrictions
- Content moderation compliance

## Future Enhancements
- Automated scheduling
- A/B testing for content optimization
- Analytics dashboard
- Multiple Instagram account support
- Content variation generation