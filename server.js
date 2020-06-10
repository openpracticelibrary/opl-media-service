const { ApolloServer, gql } = require('apollo-server');
const { buildFederatedSchema } = require('@apollo/federation');
const { gitUploader } = require('./uploaders');

const typeDefs = gql`
  scalar Upload
  enum SortByInput {
    size_ASC
    size_DESC
  }
  type UploadedMediaResponse {
    filename: String!
    mimetype: String!
    encoding: String!
    url: String!
  }
  type Image {
    type: String
    size: Int
    name: String
    link: String
    rawGHLink: String
  }
  type Query {
    images(sort: SortByInput): [Image!]!
  }
  type Mutation {
    singleUpload(file: Upload!): UploadedMediaResponse!
    coverUpload(file: Upload!): UploadedMediaResponse!
  }
`;

const resolvers = {
  Query: {
    images: gitUploader.getImages.bind(gitUploader),
  },
  Mutation: {
    singleUpload: gitUploader.uploadToRepo.bind(gitUploader),
    coverUpload: gitUploader.uploadCover.bind(gitUploader),
  },
};

const server = new ApolloServer({
  schema: buildFederatedSchema([{ typeDefs, resolvers }]),
});

server.listen(4002).then(({ url }) => {
  console.info(`🚀 Server ready at ${url}`);
});
