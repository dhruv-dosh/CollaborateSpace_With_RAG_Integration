# 🌐 CollaborateSpace: Full-Stack Project & Skill Collaboration Platform

## 🧩 Introduction

**CollaborateSpace** is a full-stack web platform built to connect students and developers based on their **technical skills and project interests**.
It helps students who have an idea but lack a team — and those who have skills but are looking for meaningful projects to join.

The platform enables users to **create projects, collaborate with others, invite teammates, post requirements, comment, communicate, and now even chat with a project-aware AI assistant** — forming a complete ecosystem for student collaboration and innovation.

---

## 🎯 Objective

To create a **centralized collaboration platform** where:

* Students can showcase their projects and invite others with required skills.
* Developers can search for projects that match their expertise ,join as contributors and use AI to understand project.
* Teams can manage projects, handle requirements, communicate efficiently.

---

## 🌟 Core Features

### 👥 User Management

* **Register & Login:** Secure authentication using unique email credentials.
* **Profile Management:** Each user can maintain their personal details and skill set.

### 💡 Project Management

* **Create Project:** Upload new projects with title, description, and required skills.
* **CRUD Operations:** Edit, update, or delete projects anytime.
* **My Projects Page:** Displays all projects created by the logged-in user.
* **All Projects Page:** Explore all projects made by other users.

### 🧠 Smart Collaboration

* **Skill-Based Search:** Filter and discover projects that match your tech skills.
* **Requirements Section:** Project owners can post requirements for team members (e.g., “Need a React developer”).
* **Comments & Suggestions:** Users can comment on project requirements to discuss details or express interest.
* **Invite via Gmail:** Project owners can directly invite potential team members via Gmail IDs.
* **Message System:** Allows users to send messages or suggestions on project pages for collaboration.

### 🤖 RAG-Powered Chatbot Integration

* Integrated with [RAG_Spring_Ai](https://github.com/dhruv-dosh/RAG_Spring_Ai), a **Retrieval-Augmented Generation** module built using **Spring AI**.
* When a project owner uploads a file (e.g., project document or readme), other users can **ask questions to the chatbot**, which answers based on that uploaded content.
* Enables **AI-powered knowledge retrieval and understanding** within each project.

### 📂 Requirements Section

* Displays all open team member requirements across the platform.
* Users can respond to open requirements or post new ones inside their own projects.

---

## 🗂 Project Structure

| Section               | Description                                              |
| --------------------- | -------------------------------------------------------- |
| **All Projects**      | Displays every project uploaded by users.                |
| **My Projects**       | Shows user’s own projects with CRUD features.            |
| **Requirements**      | Displays and manages team member needs for each project. |
| **Messages/Comments** | Enables communication between collaborators.             |
| **Chatbot (RAG)**     | Lets users ask questions based on uploaded files.        |

---

## 🧱 System Architecture

```plaintext
Frontend (ReactJS)  -->  Backend API (Spring Boot REST)(Stores Project Files For RAG for Each Project)  -->  Database (MySQL)
      |                       │
      |                       └── Gmail API (Invitations)
      └── --> RAG_Spring_Ai (Chatbot Integration)
```

---

## 🛠️ Technology Stack

### Frontend:

* **React.js, HTML, CSS, JavaScript**

  * Intuitive Single Page Application (SPA)
* **Axios**

  * Handles asynchronous API communication

### Backend:

* **Java (Version 21 or 23) / Spring Boot**

  * Core business logic and RESTful APIs
* **Spring JPA (Hibernate ORM)**

  * Efficient database communication
* **Spring Security + JWT**

  * Authentication, Authorization, and API protection

### Database:

* **MySQL**

  * Structured, reliable, and scalable data storage

### RAG Integration:

* **[RAG_Spring_Ai](https://github.com/dhruv-dosh/RAG_Spring_Ai)**

  * Enables document-based chatbot responses
  * Integrates directly with CollaborateSpace backend

### Tools:

* **Postman** for API testing
* **IntelliJ IDEA** for backend development
* **VS Code** for frontend development

---

## ⚙️ User Manual (Local Deployment)

### 🧩 Prerequisites

Ensure the following are installed:

* **Node.js (v18+)**
* **Java 21 or 23 (JDK)**
* **MySQL Server**
* **Maven**
* **Spring Boot**
* **IntelliJ IDEA or any Java IDE**

---

### 🚀 Setup & Run Instructions

#### 1️⃣ Clone the Repository

```bash
git clone https://github.com/dhruv-dosh/CollaborateSpace_With_RAG_Integration
cd CSpacebackend
```

#### 2️⃣ Setup the Database

* Create a new database in MySQL (e.g., `collaboratespace`).
* Update your database credentials in `application.properties` under the backend directory.

#### 3️⃣ Run the Backend

* Open the backend folder in **IntelliJ IDEA**.
* Select the **main class** (e.g., `CollaborateSpaceApplication.java`).
* Run it directly — the backend will start at:
  👉 `http://localhost:5054`

#### 4️⃣ Run the Frontend

```bash
cd frontend
npm install
npm start
```

Once started, the frontend will be available at:
👉 `http://localhost:5173`

#### 5️⃣ Run the RAG Chatbot Server

If you want to enable the file-based chatbot feature:

* **RAG_SPRING_AI** [RAG_SPRING_AI](https://github.com/dhruv-dosh/RAG_Spring_Ai)

RAG API runs on its configured port (check its README).
CollaborateSpace communicates with it automatically.

---

## 🔗 Helpful Resources

* **MySQL Notes:** [MySQL_Relational_Database_Notes](https://github.com/dhruv-dosh/MySQL_Relational_Database_Notes)
* **Java Notes:** [Java_In_Depth_Notes](https://github.com/dhruv-dosh/Java_In_Depth_Notes)
* **Spring Boot:** [Spring_Java_Framework](https://github.com/dhruv-dosh/Spring_Java_Framework)
* **Docker Notes:** [Docker_Notes_And_Commands](https://github.com/dhruv-dosh/Docker_Notes_And_Commands)
* **Jenkins Setup:** [Jenkins_Declarative_Pipeline_Setup](https://github.com/dhruv-dosh/Jenkins_Declarative_Pipeline_Setup)

---

### ✨ Created and maintained by [Dhruv Doshi](https://github.com/dhruv-dosh)
