set -e 

cd /frontend && PORT=3000 npm start &

cd /backend && npm run start:prod &

nginx -g "daemon off;"