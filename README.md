# Overview
My personal api project involves managing features in a blog app.

# Prerequisites
* postgresql
* node

# Initialization
* npm install
* connect to your postgres database in config/config.json and config/db-config.js
* npx sequelize-cli db:migrate
* node index

# Features
* User Authentication
* Display all user (moderator access)
* Edit User (based on user login)
* Delete User (moderator access)
* Assign user to role author (moderator access)
* Display all blog (all user access)
* Create new blog (moderator or author access)
* Edit blog (moderator or the author of the blog)
* Delete blog (moderator or the author of the blog)
* Create new tag (moderator or author access)
* Edit Tag (moderator or author access)
* Delete Tag (moderator or author access)
* add many tags to blog (moderator or author access)
* like and dislike blog (all user access)
* add comment to blog (all user access)
