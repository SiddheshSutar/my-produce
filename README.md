# ANFLOCOR Logistics Management System
 
This is a Next.js application built for TADECO/ANFLOCOR to manage international logistics and agricultural production workflows.

## Features
 
- **Loading Advice (LA)**: Batch entry system for production requirements.
- **Cutting Orders (CO)**: POD-based container allocation tracking.
- **Bookings**: Voyage and vessel confirmation management.
- **Trips**: Truck trip logging and status tracking with auto-population from bookings.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth (SSO & Email)
- **Styling**: Tailwind CSS & ShadCN UI
- **AI**: Google Genkit (Gemini 2.5 Flash)

## Pushing to GitHub

If you need to push your changes to GitHub from the terminal, follow these commands:

1. **Initialize and Commit**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Link to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   ```

3. **Push**:
   ```bash
   git push -u origin main
   ```

## Development

To run the development server:

```bash
npm run dev
```

The application is configured to connect to Firebase production services.
