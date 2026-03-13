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

## 2.Background Research

### 2.1 Existing Collaborative Whiteboard Tools

With the rise of remote and hybrid working structures, along with the ever-increasing public reliance on the Internet, the demand for a collaborative whiteboard tool has never been higher. Essential to beginning this project was understanding the landscape in which we are bringing it to birth, otherwise we risk positioning ourselves as a redundant imitator rather than a distinct tool.

Naturally, with this growing demand, several suppliers have stepped up to try and meet the need. Chief among these tools is Miro, a sort of pseudo-standard canvas tool that incorporates "sticky-note" widgets along with a host of other features to encourage free-form visual collaboration. Miro supports synchronous and asynchronous collaboration, boasts over 100 third-party integrations and offers flexible approaches to sharing and roles, with configurable access to allow for adaptive collaboration.

In contrast, the Microsoft Whiteboard tool benefits from foundational integration with the Microsoft 365 ecosystem, making it a natural choice for organisations committed to tools like Teams and OneDrive. It offers "sticky notes" and real-time co-authoring, similar to Miro, but whiteboards are saved to OneDrive where they can be revisited asynchronously. The platform provides basic functionality rather than advanced facilitation tools, making it more of a convenient built-in option than a specialist tool.

Across these tools, and the many others that become available year-on-year, we see certain patterns emerge. All provide infinite canvases with basic drawing tools. All offer collaboration with others, whether synchronously or asynchronously. Many now offer templates for common workflows and integrations with other prevalent tools.

However, the focus of this project is the gap we see across all of these tools; they all rely exclusively on conventional input methods. For the vast majority of users, this means a mouse or trackpad, which, while ubiquitous tools, provide little utility as implements for drawing. Drawing with a mouse feels disconnected from the natural gesture of drawing with pen or pencil, and similarly drawing with a trackpad feels unintuitive and awkward. While users could utilise a stylus with a tablet-like touchscreen, the requirement for external hardware is a significant barrier to entry for the basic function of these tools.

Therefore, what is missing is a whiteboard tool which, without need for external hardware, allows for natural and intuitive interaction. It is from this standpoint that we approach the concept of gesture recognition. Though deep learning models for gesture recognition improve year-on-year, there are no mainstream collaborative whiteboard tools utilising this new technology, despite the ubiquity of laptop webcams. Using only that basic webcam of a laptop, we can use the deep learning MediaPipe framework provided by Google to track on-screen hands and recognise the motions made, which are then mapped to basic drawing functions. This is the niche that Slate aims to fill. A collaborative whiteboard where users draw, pan, and zoom through natural hand movements, requiring no costly additional hardware. By combining this nascent technology with capabilities akin to existing products, we open whiteboarding to new use cases.

### 2.2 Real-Time Communication Technologies (WebSockets, Socket.IO)

The idea of collaborative whiteboarding creates requirements for real-time communication. When one user draws a line, the other must see that line with minimal latency. Achieving this requires moving beyond the traditional request-response model of HTTP.

HTTP follows a synchronous pattern: the client initiates a request, the server processes it, and the server returns a response. For real-time collaboration, this creates several problems. First, the server cannot initiate communication, it cannot notify clients of changes unless those clients poll for updates. Polling introduces either high latency or excessive overhead, depending on frequency. Second, each request establishes a new connection, adding TCP handshake overhead. Third, maintaining state across multiple requests requires additional mechanisms like sessions or tokens.

WebSockets address these limitations by providing a full-duplex communication channel over a single TCP connection. After an initial HTTP upgrade handshake, the connection persists, allowing either party to send messages at any time. This allows for low latency, bidirectional communication and high efficiency in typical use.

For a whiteboarding application, this provides critical functionality: when User A draws a stroke, the client sends a message describing said stroke, and the server then broadcasts it to User B, whose client renders it immediately.

Socket.IO provides a necessary abstraction layer over raw WebSockets, as support for WebSockets differs across browsers and configurations, and connections can be blocked by firewalls. Socket.IO addresses such challenges by offering automatic connection management to handle reconnection, using exponential backoff to avoid overwhelming servers. Socket.IO can also fall back to HTTP long polling if WebSockets are, for some reason, unavailable. Socket.IO also groups connections into "rooms", ensuring messages are broadcast only to viewers with access to a specific board, not all connected users. Socket.IO also provides support for passing JWT tokens during the connection handshake, further ensuring authorisation of users.

For Slate, Socket.IO provides an ideal tool for collaboration. The gesture-based drawing system generates a stream of actions that map to Socket.IO events. Automatic reconnection handles temporary network interruptions gracefully, which is critical for users who may move between network environments.

### 2.3 Gesture Recognition in Web Applications

Enabling gesture-based whiteboard control requires solving a complex computer vision problem in real time within the browser environment. The system must detect hands, track their movement across frames, interpret gestures and map those gestures to drawing actions while maintaining responsive UI performance. This section will examine the technology that makes this possible.

Firstly, and perhaps most fundamentally, Google's MediaPipe framework, specifically its Hand Tracking solution, has emerged as the leading technology for in-browser hand perception. MediaPipe Hands is made up of two models working in sequence, a palm detection model that identifies hand bounding boxes, followed by a hand landmark model that localises 21 key points across each hand, including fingertips, knuckles and the palm base. These landmarks are returned as coordinates, along with a depth value relative to the wrist.

With landmarks identified, MediaPipe can classify predefined gestures including Closed Fist, Open Palm, Pointing Up, &c. Each of these is accompanied by a confidence score that allows applications to threshold recognition reliability. However, for a drawing application, recognition must occur continuously as the user moves their hand. MediaPipe's Video mode processes each webcam frame with timestamps to maintain coherence. However, even Google's documentation notes that calls to MediaPipe's recognition methods run synchronously and block the user interface thread.

The recommended solution, and the one employed in Slate, is running MediaPipe in a Web Worker on a separate thread. The worker receives video frames from the main thread, processes them through MediaPipe, and posts results back. This architecture ensures the UI thread remains responsive to user input and canvas rendering continues smoothly while recognition runs at full speed without contention.

For Slate's whiteboard control, we take MediaPipe's landmarks and perform our own distance calculations to map functions such as drawing, panning and zooming to custom-defined gestures, allowing for full usage of the hand's range of mobility. The system requires only a standard webcam with no specialised equipment, making our gesture-based whiteboarding accessible to anyone with a laptop.

---

## 3. Requirements Analysis

This section outlines the requirements that define the behaviors and capabilities of Slate as an application. Requirements analysis was conducted through group discussions, evaluating competitors in the market and considering how gesture-based interaction could be incorporated into a collaborative workspace.

The goal of the system is to provide a fully functional whiteboard application that can be controlled using hand gestures captured through a webcam. The system should support real time gesture recognition, collaborative drawing, user authentication, persistent data storage and recording functionality while maintaining a responsive and low latency performance in a web browser.

The requirements are divided into functional and non-functional categories. Functional requirements describe the specific features the system must provided, while non-functional requirements describe the quality attributes and constraints which the system must operate.

### 3.1 Functional Requirements

Functional requirements define the core behaviour of the system and the features that the end user interacts with. The requiremtns are gotten from the primary objectives of the project and the uses we intend the application to have for the end user wether it be assistance with teaching or a collaborative tool.

#### User Account Management

- **User Registration**
  The system will allow new users to create an account using a unique username and password.

- **User Authentication**  
  The system will allow existing users to log in securely using their credentials.

- **Session Management**  
  The system will maintain authenticated user sessions using JSON Web Tokens (JWT) stored in httpOnly cookies.

- **Access Control**  
  The system will restrict access to certain pages and functionality to authenticated users only.

#### Gesture Recognition and Interaction

- **Hand Tracking via Webcam**  
  The system will capture video input from the user’s webcam and detect hand landmarks using the MediaPipe framework.

- **Gesture Interpretation**  
  The system will interpret specific hand gestures and map them to whiteboard actions such as drawing, stopping, panning or zooming.

- **Gesture-Based Drawing**  
  The system will allow users to draw on the whiteboard canvas using recognised gestures.

- **Gesture-Based Tool Control**  
  The system will allow gestures to be used to control drawing tools such as colour selection, brush size adjustment and undo/redo.

#### Whiteboard Functionality

### 3.2 Non-Functional Requirements

### 3.3 User Stories / Use Cases

---

## 4. System Architecture & Design

### 4.1 High-Level C4 Architecture Diagram

![C4 architecture Diagram](./images/slateDiagram.png)

### 4.2 Tech Stack

#### 4.2.1 Frontend

The frontend of this application is rendered using [Next.js](https://nextjs.org/) version 16. This is a [React](https://react.dev/learn) based full-stack framework that allows both server and client rendering.

- **Component Architecture:** UI layout is wrapped in a main page and modular sub-components in separate files are imported. This makes complex animations and blocks of JS and HTML logic to be grouped into individual components/functions, resulting in easier readability and maintenance.
- **Canvas Rendering:** The whiteboard canvas is built using the **Konva.js** library. [Konva.js](https://konvajs.org/) is a 2D graphics library that has optimized browser integration and React support. React `refs` can be passed to gesture prediction components to control the state of the Konva.js shapes.
- **Styling & UI:** \* **Tailwindcss** is used for inline styling of components; [Tailwindcss](https://tailwindcss.com/) had a small learning curve but removed the overhead of switching between style files and JSX/component logic.
  - For complex animations such as the landing page's bento box and the dynamic background effect, **Shadcn** was used. [Shadcn](https://ui.shadcn.com/) is a React component library that has pre-built components—such as buttons, responsive navbars, and footers—that enabled a smooth transition from a Figma design to a React implementation.

#### 4.2.2 Backend

Users authenticate with the application using **JWT tokens**. The **[Jose json-encryption](https://jose.readthedocs.io/en/latest/)** library is used to sign theese tokens with a secret-key and randomised salt.

- **Validation:** For server side form validation, the **[Zod](https://zod.dev/)** TypeScript-first validation library is used. This allows us to create a schema/type for form inputs using Zod's typescript types.
- **AI Orchestration:** There is a single authentication source for the server to make LLM requests, via a client secret. The **[google/genai](https://www.npmjs.com/package/@google/genai)** library retrieves this secret from a local env var, enabling stateless server actions to make new clients across requests. The **gemini-3.1-flash-lite** model is used to process requests as it has a high free rate-limit and is one of the latest stable releases.
- **Gesture Recognition:** Google's MediaPipe **[GestureRecognizer](https://ai.google.dev/edge/mediapipe/solutions/vision/gesture_recognizer)** is a synchronous model used toanalyse hand movement and provide predictions. It uses **[wasm](https://webassembly.org/)** to run natively in the browser using availbale CPU's or GPU's.
- **Data Persistence:** A **[MongoDB](https://www.mongodb.com/)** database is used to persist canvases and user credentials. The **[MongoDB Atlas](https://www.mongodb.com/products/platform/atlas-database)** service, offers 512MB of storage for free and provided easy integration because of it's clear and concise documentation.

#### 4.2.3 Deployment

For the app deployment we chose a **[containerized](https://www.docker.com/resources/what-container/)** approach. Next.js statelessness nature supports emphemeral containers out of the box.

- **State Management:** No state is maintained accross requests as **[JWT](https://www.jwt.io/)** tokens can be verified on a per request basis. Persistence is also avoided in a container approach by using MongoDB atlas to host the database.
- **Orchestration:** **[Docker compose](https://docs.docker.com/compose/)** is used to run our optimized image in a single container but allows for easy future replication.
- **Architectural Decisions:** A **[kubernetes](https://kubernetes.io/docs/home/)** deployment was discussed but deemed unnecessary for our use case.
  - The application does not maintain session data and has most computation performed client side.
  - Both the model and canvas rendering use client components with only LLM requests and responses being handled on the server.
- **Risk Mitigation:** Using load balancing, microservice architecture does not match this monolith application design. Kubernetes present risks such as resource costs from management nodes and overhead of using external tools like **[KIND](https://kind.sigs.k8s.io/)** to create clusters. Our single image and Docker compose file is the most scalable and maintainable approach for our API design.

### 4.3 API Design

Both [server and client components](https://nextjs.org/docs/app/getting-started/server-and-client-components) are utilized to choose when logic should and should not be rendered Client side.

### Client Components

Next.js client components allow us to access **state/memory** in the browser. This, in turn, is used by routes such as the landing page for dynamic interactivity, including:

- **Toggling button behavior**
- **Animation effects**

### Server Components & Security

Server components are used to stream React-generated HTML to the client, which is used to pre-render pages server side and stream the response.

> **Example:** The `ChatEngine` component uses a protected API key to safely authenticate with the [Gemini API](https://ai.google.dev/gemini-api/docs). A server component allows the API key to **only exist on the server** whilst still being able to stream the LLM response.

### Server Actions

[Server actions](https://nextjs.org/docs/app/guides/forms) are serverless (stateless) functions that use their function names as a URL. They are utilized for:

1.  **Data Validation:** Extensively validating form data beyond basic input requirements (e.g., password length).
2.  **Authentication:** Sending an **HTTP-only cookie** in responses for the browser to securely store the JWT access token for subsequent requests.

---

## Component Design: Decoupling Logic

A clear design decision was made to separate the **gesture prediction logic** from the **canvas rendering**. To do this, we used a Gesture engine and a Canvas component.

| Entity               | Responsibility                                                                |
| :------------------- | :---------------------------------------------------------------------------- |
| **Gesture Engine**   | Handles prediction logic; decoupled from implementation via an API.           |
| **Canvas Component** | Provides a "black box" handler; manages real-time rendering and state export. |

**The Integration Strategy:**

- The canvas provides a **handler object** to the Gesture engine, offering an API to perform CRUD operations on the Canvas.
- Developers of the gesture recognition were able to completely decouple themselves from the canvas implementation by using this API.
- Canvas developers, in turn, had to provide a black box handler that covered all requirements of the gesture engine (e.g., rendering a real-time line and exporting the current canvas state).

## 5. Implementation

### 5.1 Authentication System

The authentication system handles registration, login and session management. It was one of the first features built because almost everything else in the app depends on knowing who the current user is. The system is built with Next.js Server Actions, JWT tokens and httpOnly cookies.

#### 5.1.1 Registration & Login Flow

Both the login and register pages share a reusable `AuthForm` component that renders a username/password form. The pages are thin client components that wire the form up to a Server Action using React 19's `useActionState` hook. This gives us a clean way to call a server-side function from a form submission and get back validation errors without writing manual fetch calls or API routes.

When a user submits the register form the `registerAction` in `src/app/(auth)/actions/register.ts` runs on the server. It first validates the input with a Zod schema defined in `src/lib/validation/auth.ts` which enforces that usernames are 3 to 20 characters containing only letters, numbers and underscores and that passwords are at least 8 characters. If validation fails the action returns human readable error messages in a red banner.

If validation passes the action connects to MongoDB, checks whether the username is taken and if not hashes the password with `bcryptjs` using a salt of 10 rounds before creating the user document. The User model in `src/app/models/User.ts` is a straightforward Mongoose schema with `username`, `password` and `createdAt` fields. After creating the user it generates a JWT containing the `userId` and `username` and sets it as an httpOnly cookie named `session` with a 7 day expiry. Once set the action calls `redirect("/")` to send the user to the home page.

The login flow in `loginAction` follows the same structure. It validates with the same Zod schema, looks up the user by username and uses `bcrypt.compare` to check the password against the stored hash. It deliberately returns the same generic "Invalid username or password" message whether the username does not exist or the password is wrong to avoid leaking which usernames are registered. On success it creates a JWT and sets the cookie just like registration does. Logout simply deletes the session cookie since JWTs are stateless and no server-side invalidation is needed.

One thing worth noting: the `redirect()` call in both actions is placed **outside** the try/catch block. Next.js internally throws an error to perform a redirect so if that throw gets caught the redirect silently fails. This tripped us up during development until we figured out what was happening.

#### 5.1.2 Session Management & Middleware

Session management revolves around the JWT stored in the `session` cookie. The `src/lib/auth.ts` file contains all the token utilities. `createToken` builds a JWT signed with HS256 using `jose` with a 7 day expiration. `verifyToken` decodes a token and returns null if it is expired or tampered with. `getSession` reads the cookie and calls `verifyToken`. `getAuthenticatedUser` goes further by looking up the full user document from MongoDB using the `userId` in the payload which is needed in places like the whiteboard page.

Route protection is handled by Next.js middleware in `src/middleware.ts`. It runs on every request matching the `matcher` pattern covering `/login`, `/whiteboard`, `/home`, `/settings` and `/recordings`. The middleware reads the `session` cookie and verifies it with `jwtVerify`. If someone tries to access a protected route without a valid session they get redirected to `/login`. If a logged in user visits `/login` they get sent to `/whiteboard` since there is no reason for them to see the login page again.

Using middleware rather than checking the session inside each page gives us a single source of truth for access control that runs before any page rendering. It also keeps the page components clean since they do not need to handle auth checks themselves.

### 5.2 Whiteboard Canvas

#### 5.2.1 Drawing Engine & Canvas API

### Drawing Engine & State Management

The drawing engine is an **isolated API** provided by the Canvas component, located in the `Canvas.tsx` file. The parent whiteboard `page.tsx` passes a ref to the Canvas engine to set the ref object to a handler object.

#### Abstraction via Refs

A ref is used here as it allows the child component Canvas to set the object without re-rendering the component tree. The React hook [useImperativeHandle](https://react.dev/reference/react/useImperativeHandle) sets the `ref.current` to a handler object with functions such as:

- `exportLine`
- `drawLine`

This approach provides functionality without giving direct access to the canvas components, creating a **clear layer of abstraction** between the Canvas rendering and the gesture predictions. The page component can then share this ref handler with the gesture engine to call when predictions are updated.

---

### Optimized Rendering with Konva.js

Inside the Canvas component, the **Konva.js** React library is harnessed for optimized 2D rendering. The `Stage` component wraps layers of grouped shapes:

1.  **Persistent Layer:** Consists of line data passed as a prop from the parent component. This state is persisted in the **MongoDB store**.
2.  **Active Line Layer:** To avoid re-rendering the entire state for every point update, we employed a separate **Line object**. This single Line is updated for every point added via the handler, but crucially only re-renders all the line data when a user has stopped drawing and the current line is added to the MongoDB store.
3.  **UI/Utility Layers:** Added to visualize highlighted lines for copying and to integrate size selection and a color wheel.

#### Shape Visualization

All 2D visualization is drawn using a **Line shape**, with one primary exception:

- **LLM Generated Data Structures:** Uses arrows and circles to more accurately represent nodes and pointers for linked structures.

#### 5.2.2 Colour Selection & Size Selector

It was an important consideration that the internal canvas UI and the external React based UI had a clear separation of responsibilities. The external UI is used for lower priority features, features that link with other, non-canvas related parts of the system, and fallback options for features that are already encapsulated by gestures.

Choosing the size of your pen and the colour you write with were identified as the most core options for users and are therefore were assigned to central gestures. Both the `ColourWheelSpinner` and `SizeSelector` are implemented as React components which sit in a separate Konva layer above the drawing canvas. This ensures data integrity for user creations.

The spinner is implemented using Konva. The rotation of the wheel is controlled by a `rotationAngle` property, and the component calculates the selected segment based on this angle which is approximated from a normalized horizontal motion. The active segment is visually highlighted by increasing its size and opacity. Similarly for sizing, a normalized vertical motion is used to navigate a sequence of Konva `rects` mapping to different fill widths.

#### 5.2.3 Undo/Redo System

The undo/redo system is functionally a command pattern centred on discrete actions. Rather than storing entire canvas snapshots, which would end up being very memory intensive, the system records each user line stroke and maintains an undo stack and a redo stack.

The system is implemented as a dedicated class that manages the two independent stacks. The class provides methods for recording four types of actions: adding a single line stroke, adding multiple line strokes (for pasting operations), clearing the entire canvas, and replacing a set of strokes (for cutting operations). Each action type encapsulates data to reverse the operation completely.

The undo operation pops the most recent action from the undo stack and pushes it onto the redo stack. The action is then reversed. So if a line was added, it is removed from the canvas or if the canvas was cleared, all cleared content is restored.

The redo operation reverses this by moving the action back to the undo stack. The key feature here is that the `React` component state always remains the primary source for rendering. The undo/redo stacks never directly manipulate component state. Instead, the stacks store action data, and the parent component uses this data to update state, which then triggers the system to render again.

#### Off Hand Gesture Activation

The undo and redo features are mapped to left/off hand gestures. The left/off hand is recognised by the system, simply tracking the second hand that appears on camera and treating it as the left/off hand. The first hand that appears on the camera is allocated as the right/main hand, responsible for all controls apart from undo/redo. We made this separation to keep the undo/redo features easily accessible while also preventing any accidental triggers while drawing.

`Undo gesture:` With the left/off hand, do an index finger pinch. The gesture fires once, then enters a 500ms cooldown to prevent accidental repeated undos if the user holds the gesture.
`Redo gesture:` With the left/off hand, do a ring finger pinch. The same cooldown applies.

The gestures were kept a finger apart due to the fact that the off/left hand was allocated for specifically undo/redo, meaning we were not compromising on gestures by having that space between them. The space simply provides another means of mitigation against gesture misidentification.

#### 5.2.4 View Transform (Pan/Zoom)

The whiteboard operates in two coordinate spaces. `Screen space` refers to pixels relative to the browser window, with the origin at the top-left. `Canvas space` refers to the logical coordinates of the whiteboard, where users can zoom and pan freely. All drawn strokes are stored in canvas space; rendering requires conversion to screen space.

The `ViewTransform` class manages the transformation between these spaces, encapsulating all the operations required for correct rendering under arbitrary zoom and pan. This class maintains three key parameters that fully define the view state. A scale factor, an X offset representing horizontal pan in screen pixels, and a Y offset representing vertical pan. The class also defines constraints such as a minimum scale of 0.5x, a maximum scale of 3.0x, and a pan damping factor that moderates the speed of pan operations to filter hand jitter.

Using these maintained values the screen can redraw what is on the canvas as well as apply the canvas transforms without making any visible difference to the user. The line strokes already on the canvas are redrawn accounting for scale and offset every time either scale or offset change, allowing for seamless and efficient zooming and panning. The visual cursor also accounts for the scale and offset so that it always accurately shows where the user is about to draw.

Zooming is implemented with point centered scaling, which ensures a specific reference point on the canvas remains fixed at the same screen position before and after the zoom operation, even as the scale changes. This is crucial for usability because if a user zooms at their cursor position, they expect that position to stay under the cursor.

#### Zooming

The algorithm begins by storing the old scale factor, computing the new scale factor with clamping, and then recalculating the pan offsets dynamically. If a point in canvas space maps to a particular screen position, and we want that screen position to remain fixed after zooming. A change notification callback is invoked whenever zoom occurs, triggering a `React` state update that causes Konva to re-composite the scene with the new transforms applied.

#### Panning

Panning is simply a direct translation of the view. When the user pans, the system adds the pan delta to both the X and Y offsets. The `panSpeed` factor serves as a damping multiplier that amplifies the hand movement slightly to make panning feel responsive. We kept this low as a factor of exactly 1.0 would provide a direct movement correlation. The damping prevents the canvas from jittering with every small hand tremor. A callback notifies the parent component that the view has changed, triggering a re-render.

#### Gesture for Pan & Zoom Control

`Panning Gesture:` Panning is done by simply doing a middle finger pinch and moving the hand around as if you are dragging the canvas. The panning accounts for the fact that for this to work the canvas is actually moving inversely to the hand, but this was done as it would feel the most natural to the user.

`Zooming Gesture:` Zooming is done by making a gun with the main hand that is pointing towards the user's left. While this may sound like a far leap from all of our pinching gestures so far, due to the thumb being distinctly away from the rest of the fingers during this gesture, gesture misidentification is heavily mitigated. The gun would then be moved up and down to allow the user to zoom in or zoom out. Since the zooming is based on a hand landmark node on the palm, smoothing filters were also applied to this gesture in particular to prevent aggressive zooming.

#### Re-rendering

Konva's `Stage` component provides built-in properties for applying 2D transformations to all child elements. When the Canvas component renders, it configures the Stage with the current scale and offset values from `ViewTransform`. Konva internally manages all transformation matrix mathematics. The application simply provides the scale and offset parameters, and Konva applies them uniformly to every shape in the rendered scene. This abstraction eliminates the need for manual matrix composition.

### 5.3 Real-Time Collaboration

#### 5.3.1 Socket.IO Integration

#### 5.3.2 Canvas State Synchronization

#### 5.3.3 Shared Canvas & Permissions

### 5.4 Gesture Recognition

#### 5.4.1 GestureEngine & Custom Gestures

We had to extract verifiable gesture data from a set of 21 landmarks from the MediaPipe worker. Mediapipe offers a very limited set of in-built gestures. We supplemented these by creating the `CustomGestures.ts` module which takes the 2D landmarks as an input and runs them through a sequence of gesture recognition algorithms and produces the most likely gesture. These algorithms mostly isolate a specific motion that is both easy for the user to perform and distinct from other gestures.

#### 5.4.2 Web Worker for Performance

The MediaPipe machine learning model is by far the most expensive element of the system and for this reason it needed to be optimised as much as possible. We chose to spin the model onto it's own thread using a worker which runs the model separately from the main React UI thread. This approach significantly counteracted the performance issues which can occur when attempting such intensive computation in a web browser.

#### 5.4.3 Smoothing with the 1€ Filter and Interpolation

Maximising the user experience for the core functionalities like drawing a line was essential. For this reason we made use of a smoothing algorithm to remove the jitter and unpredictability caused by latency. we researched extensively and found that the academic consensus preferred the 1€ Filter for this type of task. The filter was implemented in javascript and a 3 point system was applied when drawing. The filter is applied to the thumb, index and pinch landmarks individually, and subsequently and exponential moving average is taken of all three, finally the output point is interpolated by a 50ms time window. We found that this approach allows for users to better understand how to interact with the application intuitively.

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
- **restart: unless-stopped** automatically restarts the container only if it crashes.

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

Given the collaborative nature of the group members did more than prescribed below, therefore below is an over arching summary of each members undertakings in the nine weeks.

- Frank - Project Lead and Database
- Rory - Screen Recording and Saving
- Naoise - React, UI and LLM
- Rakib - Gesture Functionality
- Tom - Gestures as Whiteboard features
- Darragh - Smoothing and React conversion
- Oisín - Smoothing and UI

### 8.2 Methodology (Agile/Scrum)

The team chose to use the Agile development methodology with elements of the Scrum framework blended into it. The Agile methodology is just that, a methodology whereas Scrum is a framework for Agile project management that can be followed. It is best to use the methods that allow the project to succeed rather then be held back in trying to follow a framework to the letter.

Agile methodology suited the collaborative nature of the environment in which the project was developed. The size of the group and the list objectives to be achieved would have been significantly hampered by Waterfall with team members waiting for other pieces of the process to be completed before they could even begin working. The Waterfall methodology would have removed the collaborative environment in meetings which allowed new ideas to be pitched at all times to solve individual parts of the design. This open and discussion heavy space needed the Agile methodology to ensure the group was adaptable in a fast moving development environment.

Parts of Scrum that were utilised were the Sprints, Sprint planning, Sprint demo and Project Lead. The Sprints gave structure to an open project development environment by providing immediate deadlines week on week to ensure that new integrations, bug fixes and changes were continuously made. This was in an attempt to have continuous improvement to the deployable product so as to meet the aforementioned short deadline.
Sprint Planning took place each Wednesday before or after the meeting with Klaas as did the Sprint demo. Instead of separating these into separate events they were combined into one each week as the group as a majority, not always a whole, were present. Team members could display there changes to those present and the features function, viability and necessity would be evaluated as a group there. The goal each week was to deliver what was planned in the Sprint Planning the week prior. The product backlog would be looked at to find wanted features and based on whom previous worked in an area of the project the PBI would be given to the team member for which it made most sense to complete it.
Given there was no customer to give feedback on the weekly sprint, the team became the Scrum Product Owner constantly evaluating and analysing everything committed to the code base to ensure it was pushing the project in the correct direction.

This Agile environment allowed the group to work fast and in parallel, enabled by Git, to keep development moving quickly and iteratively. The iterative nature of the process and frequent communication benefited the project as it allowed the team to be adaptable and make changes rapidly and when needed. The use of these methodologies and frameworks was a significant contributor to the success of the project.

### 8.3 Sprint Breakdown & Timeline

As stated above we used Agile and Scrum to complete this project which consisted of **one week Sprints** allowing for continuous integration and improvement and the flexibility to modify requirements.

**Sprints**

1. - Inception of idea and the creation of the basic JavaScript file to test viability.
   - Apply smoothing algorithm to drawing gestures.
   - Select gestures to be used for drawing.
2. - Integration of the basic "Whiteboard" with React.
   - Improvement in smoothing algorithm, Gesture Engine implementation.
   - Creation and integration of screen recording to whiteboard.
   - Refactor and removal of redundant code.
3. - Creation and setup of MongoDB database for storing saved 'Slates', recordings and user details.
   - Addition of JWT token session management.
   - Implementation of Register and Login features.
4. - UI of landing page made.
   - Homogenisation of the UI for a consistent feel.
   - Consolidated routing to pages within website.
   - Introduction of gesture based panning and zooming.
   - Consolidated saving to MongoDB Atlas Cluster
5. - Create Saved whiteboard function and optimise.
   - Creation and optimisation of file sharing.
   - Colour spinner created and integrated.
   - Settings menu created and designed with CSS.
   - Addition of Copy/Paste feature
6. - Improvement panning, colour wheel and sidebar.
   - Integration of Undo/Redo through gestures.
   - Integration of keybinds for undo,redo,cut.
   - Improvement to settings page with a keyboard shortcut for access and display improvements.
   - Add colour white to colour wheel.
7. - Addition of gesture based zoom.
   - Moved undo/redo gestures to left hand.
   - Rectified issues with screen recording.
   - Addition of promptable LLM that can draw for you.
   - Ensure main branch is functioning minimum viable product for presentation.
8. - Setup Docker files for containerisation
   - Finalise products features.
   - Create Docker image and deploy.

A deployable version of the product was ready by week 8 for a live demonstration during the presentation and a fully fledged version was completed by week 9 of the semester. The goal was to have the fully fledged product available for the presentation but due to the requirement for it to be functioning for the presentation certain features had to be compromised.

### 8.4 Version Control Strategy (Git)

Our version control strategy was implemented using Git which is an industry standard for version control in software development environments. Given that version control is the backbone for any successful software project it was important clear guidelines were laid out and a system was followed.

The group settled on Feature Branching as the branching and development strategy for the project. This was selected over GitFlow and Trunk-based development as it suited the Agile nature of the team. Trunk-based combined with our 7-person team would have become far too messy as this requires 'main' to be the only branch and all changes to be made and committed here. GitFlow overcomplicated how development would occur as it needed multiple branches such as 'main', 'develop' and 'release' on top of all the individual 'feature' branches. Feature Branching however keeps 'main' as the deployable branch into which each feature from feature branches are integrated. Feature Branches are isolated versions of 'main' where each new feature is developed whilst avoiding introducing bugs etc. into the deployable 'main' branch. This isolation facilitated the Agile nature of the groups workflow allowing separate and contrasting features to be developed in parallel. Before pushing the new feature it was made clear that 'main' must be pulled into the branch to ensure the feature worked correctly in harmony with any changes integrated during your individual development time and that it didn't introduce any bugs into working code.

Commits containing a whole purpose however frequent were to be made rather combining multiple purposes into one large commit. This can compromise the codebase as if a bug was to be introduced in a commit with multiple changes the difficulty of finding and fixing this bug is far greater than if the commit contained a single unit of development which could be examined for mistakes. Commit messages were to be clear, concise and relevant to what was being committed, this ensured a clean git log and commit history. Tags were not used in this project due to the short time span in which it was developed the only 'version' created was the final presented one.

If a commit was reliant or impacting upon another feature group members were required to sufficiently communicate their progress to each other before committing to prevent either party having a negative effect on the code base or each others features. Changes were to be pushed as frequently as necessary to make them available for other team members to interact with on their own branches as mentioned previously.

By adhering to our own guidelines it kept consistency amongst the group and allowed the project to be delivered on time with minimum errors and mishaps.

### 8.5 Communication & Collaboration Tools

The team communicated on a daily basis through a WhatsApp group chat created at beginning of this process, this allowed for quick updates, information sharing and collaboration between team members outside of the university campus. This greatly increased efficiency of the development process providing instant access to resources and information. The existence of WhatsApp for the web made it the only communication channel used as this allowed for links to sites and other resources to be accessed on one's own laptop or PC rather than their mobile phone.

The primary collaboration tool used was Git as detailed above facilitating the development and integration of differing features into one deployable final product. For the presentation a shareable PowerPoint was made to allow each speaker to make their own individual slides, this kept the styling consistent throughout the slide deck.

---

## 9. Evaluation & Discussion (Rakib)

### 9.1 Objectives Met vs. Not Met

### 9.2 Technical Challenges & Solutions

### 9.3 Performance Analysis

---

## 10. Future Work

### 10.1 Planned Enhancements

If we had more time, the first thing we would tackle is making collaboration truly real-time. Right now Socket.IO is only used to notify someone when a canvas gets shared with them, but you cannot actually watch another person draw live. The good news is that the Socket.IO rooms and events are already wired up in the server, so broadcasting stroke data as it happens and rendering it would be a vital feature.

We would also want to expand the gesture set. At the moment drawing only works with the right hand and the left hand is limited to undo and redo. An eraser gesture would be really useful because right now if you make a small mistake you have to keep undoing strokes until it is gone. We also talked about shape recognition where the system notices you are trying to draw a straight line or a rectangle and cleans it up for you automatically. That would make Slate a lot more practical for diagrams. Being able to select, move and resize shapes after drawing them is another thing we want to add since once something is on the canvas right now it is stuck there unless you undo it.

The AI assistant could be a lot smarter too however we are limited to the free version of the GeminiAI model. It generates shapes from text prompts but it has no idea what is already on the canvas, so you cannot say something like "connect those two boxes." Giving it that context would make it far more useful. We would also like to turn the settings page into an actual settings page where users can change their keybinds and adjust gesture controls to suit how they work.

### 10.2 Scalability Considerations

The biggest problem that could be faced at scale is how recordings are stored. They are saved as raw binary buffers inside MongoDB documents and MongoDB has a 16MB document size limit. Even a short recording could hit that. A larger cluster would help with general capacity but the document size cap is a hard limit and there is cost issues with a larger database size. Canvas data has a similar issue on a smaller scale since every single stroke point sits inline in one document. Sending only the new shapes to the server instead of the whole canvas each time would cut down on both network traffic and database writes.

On the infrastructure side our Docker Compose setup is just a single container with no health checks or logging. For a proper production deployment we would add a health endpoint, set up structured logging and forward those logs somewhere central so we can actually diagnose issues without poking around inside the container. The app is stateless by design so scaling horizontally behind a load balancer would be straightforward, though Socket.IO would need a Redis adapter so events reach every instance. Setting up a CI/CD pipeline with GitHub Actions to build the image and push it to a registry on every merge is something we ran out of time for but it would catch problems earlier and make deployments much more consistent.

### 10.3 Additional Features

Users should be able to save their whiteboard as a PNG, SVG or PDF. Konva already supports exporting the stage to an image so the frontend side of this would be fairly quick to build.

On the accounts side there is no email verification, no way to reset a forgotten password and no option to log in with Google or GitHub. It uses the most basic username and password login system with no email or additional info needed at registration. OAuth would be needed for Google sign-in and further authentication will be needed.

We also talked about an offline mode. If the gesture model was cached locally with a service worker and canvas data was saved to IndexedDB until the connection came back you could sketch without needing the internet at all. Finally, even though the whole point of Slate is making whiteboarding more accessible through gestures, not everyone can use gestures. Making sure every gesture action has a keyboard shortcut and adding high contrast themes would make the app properly inclusive for everyone.

---

## 11. Conclusion

The goal of this project was to build a whiteboard you could control with just your hands and a webcam. In nine weeks with a seven person team we delivered exactly that. Slate lets you draw, pan, zoom, pick colours, adjust brush size and undo or redo all through hand gestures tracked by MediaPipe running in a Web Worker. The 1€ filter smooths out the raw tracking data so it actually feels natural to use.

Around that core we built a full web application with JWT authentication, automatic canvas saving to MongoDB, whiteboard sharing with Socket.IO, screen recording and an AI assistant powered by Google Gemini. The whole thing is containerised with Docker Compose so it can be deployed with a single command.

There are gaps we did not get to. Live collaborative drawing, export to PNG or PDF and proper account recovery are all future work. The recording storage will not scale past MongoDB's 16MB document limit either. But these are problems we understand well and know how to solve.

What this project proved is that gesture-based interaction in the browser is not a novelty. With open source libraries and a standard laptop webcam you can build a genuinely usable tool. Slate is not perfect but it is unique and it works and it works without any extra hardware. We believe in this innovative product that can change the interactive drawing world and this idea can be revolutionary in teaching and learning.

---

## 12. References

---

## 13. Appendices

### Appendix A: Full API Documentation

### Appendix B: Database Schema Details

### Appendix C: User Manual / Screenshots

### Appendix D: Meeting Minutes / Sprint Logs

### Appendix E: Individual Contributions
