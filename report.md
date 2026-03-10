# Slate – Hands Free Gesture Based Whiteboard

## 1. Introduction

### 1.1 Project Overview

Slate is a web-based collaborative whiteboard controlled entirely through hand gestures. Rather than using a mouse or pen, users draw, pan, zoom and select tools by moving their hands in front of a standard webcam. The application tracks hand landmarks using Google's MediaPipe library and translates gestures such as a pinch to draw or an open palm to stop, into canvas actions in real time.

The project is built with Next.js 16 (React 19, TypeScript) on the frontend, using Konva for canvas rendering and a Web Worker to run gesture recognition without blocking the UI. The backend is a custom Node.js server with Socket.IO for real-time collaboration, MongoDB for data storage using JSON and JWT authentication. The whole app is containerised with Docker Compose.

Key features include gesture-driven colour and brush size selection, undo/redo, whiteboard sharing with live notifications and screen recording.

### 1.2 Problem Statement

Existing digital whiteboards all rely on conventional input like mouse, trackpad or stylus. This presents several issues:

- **Accessibility** — users with motor impairments or repetitive strain injuries may struggle with these input methods.
- **Unnatural interaction** — drawing with a mouse feels disconnected from the natural act of sketching on a real whiteboard.
- **Hardware cost** — devices like SMART Boards or drawing tablets address some of these issues but are expensive and impractical for most individuals.

What is missing is a free browser-based whiteboard that works with just a webcam that nearly every laptop already has. Slate was built to fill this gap: a hands-free, gesture-controlled whiteboard that requires no additional equipment.

### 1.3 Objectives & Goals

**Primary Objectives:**

1. **Gesture-controlled drawing** — use webcam-based hand tracking as the sole input for drawing on the canvas.
2. **Real-time collaboration** — allow multiple users to work on the same whiteboard simultaneously via WebSockets.
3. **User authentication** — registration, login and JWT session management so whiteboards are linked to user accounts.
4. **Canvas persistence** — save whiteboard state to MongoDB so users can reload their whiteboards.
5. **Core whiteboard tools** — colour selection, brush sizing, undo/redo, panning and clearing.
6. **Containerised deployment** — package the app with Docker Compose for an easy and lightweight deployment.

**Secondary Objectives:**

7. **Whiteboard sharing** — share boards with other users with real-time Socket.IO notifications.
8. **Session recording** — screen recordings that can be uploaded, replayed and downloaded.
9. **Smooth tracking** — apply a smoothing algortihm to hand landmark data to reduce jitter.
10. **Performant processing** — run MediaPipe in a Web Worker to keep the main thread responsive.

### 1.4 Scope & Limitations

**In scope:** A fully functional, deployable web application covering the complete development lifecycle — requirements, design, implementation, testing, deployment, and this report.

**Limitations:**

- **Mobile** — designed and tested for desktop browsers only.
- **Offline mode** — an internet connection is required for authentication, persistence and collaboration.
- **Security hardening** — JWT auth and httpOnly cookies are implemented but no formal security audit, rate limiting or CSRF protection was carried out. The app is not fully ready yet for large scale production.
- **Browser compatibility** — tested primarily in Chrome and Safari. Other browsers were not formally verified.
- **Scalability** — tested with a small number of concurrent users and no load testing was performed.

---

## 2.Background Research  [Darragh]
### 2.1 Existing Collaborative Whiteboard Tools

With the rise of remote and hybrid working structures, along with the ever-increasing public reliance on the Internet, the demand for a collaborative whiteboard tool has never been higher, and naturally several suppliers have stepped up to try and meet this need. Chief among these tools is Miro, a sort of pseudo-standard canvas tool that incorporates "sticky-note" widgets along with a host of other features to encourage free-form visual collaboration.


### 2.2 Real-Time Communication Technologies (WebSockets, Socket.IO)
### 2.3 Gesture Recognition in Web Applications


---

## 3. Requirements Analysis 
### 3.1 Functional Requirements
### 3.2 Non-Functional Requirements
### 3.3 User Stories / Use Cases

---

## 4. System Architecture & Design 
### 4.1 High-Level Architecture Diagram
### 4.2 Tech Stack
#### 4.2.1 Frontend 
#### 4.2.2 Backend 
#### 4.2.3 Deployment 
### 4.3 Database Schema Design
### 4.4 API Design
### 4.5 Real-Time Communication Design

---

## 5. Implementation 
### 5.1 Authentication System
#### 5.1.1 Registration & Login Flow
#### 5.1.2 Session Management & Middleware
### 5.2 Whiteboard Canvas
#### 5.2.1 Drawing Engine & Canvas API
#### 5.2.2 Colour Selection & Size Selector
#### 5.2.3 Undo/Redo System
#### 5.2.4 View Transform (Pan/Zoom)
### 5.3 Real-Time Collaboration
#### 5.3.1 Socket.IO Integration
#### 5.3.2 Canvas State Synchronization
#### 5.3.3 Shared Canvas & Permissions
### 5.4 Gesture Recognition
#### 5.4.1 GestureEngine & Custom Gestures
#### 5.4.2 Web Worker for Performance
#### 5.4.3 1€ Filter for Smoothing
### 5.5 Recording Feature
#### 5.5.1 Recording Controls
#### 5.5.2 Upload & Storage
### 5.6 Camera Integration

---

## 6. Deployment
### 6.1 Docker Containerization

We used Docker to containerise Slate so the application builds and runs the same way regardless of the host machine. This avoided issues like having to manually install all dependencies and packages.

The Dockerfile uses a multi-stage build with three stages:

1. **deps** - Installs npm dependencies on a `node:20-alpine` base image using `npm ci --legacy-peer-deps`. The flag was needed because some dependencies (React 19 and framer-motion) had conflicting peer requirements.

2. **builder** - Copies `node_modules` from the first stage along with the source code and runs `npm run build` to produce the Next.js production build.

3. **runner** - The final image. Only copies what is needed to run: `node_modules`, `.next`, `public`, `server.mjs`, `package.json` and `next.config.ts`. It exposes port 3000 and starts the app with `node server.mjs`.

This multi-stage approach keeps the final image small by discarding source code and build tooling.

### 6.2 Docker Compose Configuration

Docker Compose wraps this into a single command. The `docker-compose.yml` defines one service:

```yaml
services:
  slate:
    build:
      context: ./slate
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    env_file:
      - ./slate/.env.local
    restart: unless-stopped
```

- **ports** maps container port 3000 to the host so the app is available at `http://localhost:3000`.
- **env_file** loads secrets from `.env.local` which is not committed to the repo.
- **restart: unless-stopped** automatically restarts the container oif it crashes.

To deploy the application:

```bash
docker compose up --build
```

### 6.3 Environment Configuration

Slate uses a `.env.local` file in the `slate/` directory for environment specific config. The required variables are:

`MONGODB_URI`:Connection string for the MongoDB Atlas cluster.

`JWT_SECRET`:Secret key used to sign and verify JWT session tokens 

MongoDB Atlas handles database hosting externally so the Docker setup only needs to run the Next.js app itself. If either variable is missing the app falls back to hardcoded defaults which is fine for local development but would need to be changed for a real deployment.


---

## 7. Testing 
### 7.1 Testing Strategy
### 7.2 Unit Tests
### 7.3 Integration Tests
### 7.4 User Acceptance Testing
### 7.5 Test Results & Coverage

---

## 8. Project Management 
### 8.1 Team Roles & Responsibilities
### 8.2 Methodology (Agile/Scrum)
### 8.3 Sprint Breakdown & Timeline
### 8.4 Version Control Strategy (Git)
### 8.5 Communication & Collaboration Tools

---

## 9. Evaluation & Discussion 
### 9.1 Objectives Met vs. Not Met
### 9.2 Technical Challenges & Solutions
### 9.3 Performance Analysis


---

## 10. Future Work 
### 10.1 Planned Enhancements
### 10.2 Scalability Considerations
### 10.3 Additional Features

---

## 11. Conclusion 

---

## 12. References

---

## 13. Appendices
### Appendix A: Full API Documentation
### Appendix B: Database Schema Details
### Appendix C: User Manual / Screenshots
### Appendix D: Meeting Minutes / Sprint Logs
### Appendix E: Individual Contributions