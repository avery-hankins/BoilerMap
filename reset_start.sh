# builds the frontend and starts the backend process
DIR=$(dirname "$0") # directory of THIS script

cd "$DIR/src/frontend";
npm run build;
cd "../backend";
npm start;
