# Setup commands
npm install
npm start OR node index.js

# Add/remove referance images
Add image file to ./references/
Add name of file + file extension into the referenceImages variable in index.js

# How does it work?
It searches for every message, if it has an attachment, it checks if its an image, if it is, it grabs the image(s), and checks the hash data of the image and checks if it fits with the reference images, simple
