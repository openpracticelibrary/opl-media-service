# Open Practice Library - Media Service
A service for compression, optimization and storage of media for the Open Practice Library.

Currently uses GraphQL for both upload and retrieval, media is stored in the [opl-media](https://github.com/openpracticelibrary/opl-media) GitHub repository.

## Run it locally
The service is set up to use the GitHub uploader by default. To use it, you will need to provide a few environment variables:
```
GITHUB_PAT - (github personal access token, so that the service can commit to the repository)
GITHUB_ORG - (github org where your repository lives)
GITHUB_REPO - (repository where your images are to be stored)
GITHUB_PAGES_URL - (base url for images stored in your github repository, we use pages, you don't have to)
```
After those environment variables are set, you can run the service:
```
node server.js
```
To test a file upload, you can open another terminal and run the following curl command (be sure to update the path to the image you're uploading on the last line):
```
curl -s -X POST \
    http://localhost:4002/graphql \
    -H "Content-Type: multipart/form-data" \
    -F 'operations={"query": "mutation ($imageUpload1: Upload!) { singleUpload(file: $imageUpload1) { filename, url } }","variables": { "imageUpload1": null } }' \
    -F 'map={ "z_image1": ["variables.imageUpload1"] }' \
    -F "z_image1=@/path/to/your/image"
```
You can also retrieve all images in your repository via GraphQL query. A curl command would look like so:
```
curl -X POST http://localhost:4002/graphql \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    --data-binary '{"query": "query { images { name, rawGHLink, link, size, type } }"}'
```
For more information on the GraphQL schema and what can be done with it, checkout the GraphQL web interface.
