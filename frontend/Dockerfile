FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy project files
COPY . .

# Expose port 3000 for CRA dev server
EXPOSE 3000

# Start in development mode
CMD ["npm", "start"]
