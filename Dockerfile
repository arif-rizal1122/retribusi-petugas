# Dockerfile for retribusi-petugas (Nginx Alpine)
FROM nginx:alpine

# Copy build files
COPY ./dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
