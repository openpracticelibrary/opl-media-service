const { ApolloServer, gql } = require('apollo-server');
const { buildFederatedSchema } = require('@apollo/federation');
const { gitUploader } = require('./uploaders');

const typeDefs = gql`
  scalar Upload
  type UploadedMediaResponse {
    filename: String!
    mimetype: String!
    encoding: String!
    url: String!
  }
  type Query {
    hello: String!
  }
  type Mutation {
    singleUpload(file: Upload!): UploadedMediaResponse!
  }
`;

const resolvers = {
  Query: {
    hello: () => {
      // TODO: return record of files uploaded
      return "Hello World"
    },
  },
  Mutation: {
    singleUpload: gitUploader.uploadToRepo.bind(gitUploader),
  },
};

const server = new ApolloServer({
  schema: buildFederatedSchema([{ typeDefs, resolvers }])
});

server.listen(4002).then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});

