# League of Legends Clash Attendee Manager

## Description
This is a full-stack Node.js web application built with Express, Pug, and MySQL.
Users can register, log in, manage their accounts, and create/edit/delete
attendees for a League of Legends Clash event.

## Technologies Used
- Node.js
- Express
- Pug
- MySQL
- express-session
- bcrypt

## How to Run the Project

### 1. Install dependencies
```bash
npm install

### 2. Create a .env file
Create a .env file in the project root with the following variables:
DB_HOST=cse-mysql-classes-02.cse.umn.edu
DB_USER=YOUR_DB_USERNAME
DB_NAME=YOUR_DB_NAME
DB_PASSWORD=YOUR_DB_PASSWORD

### 3. Start the server
'''bash
node server.js

### 4. Open in your browser
http://localhost:8006
