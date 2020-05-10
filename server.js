const { ApolloServer, gql } = require('apollo-server');
const { buildFederatedSchema } = require('@apollo/federation');
const { s3Uploader } = require('./uploaders');

const typeDefs = gql`
  type UploadedMediaResponse {
    filename: String!
    mimetype: String!
    encoding: String!
    url: String!
  }
  type Query {
    uploads: [UploadedMediaResponse]
  }
  type Mutation {
    singleUpload(file: Upload!): UploadedMediaResponse!
    multipleUpload(files: [Upload!]!): UploadedMediaResponse!
  }
`;

const resolvers = {
  Query: {
    files: () => {
      // TODO: return record of files uploaded
      return "Hello World"
    },
    Mutation: {
      singleUpload: s3Uploader.singleUploadResolver.bind(s3Uploader),
      multipleUpload: s3Uploader.multipleUploadResolver.bind(s3Uploader)
    }
  },
};

const server = new ApolloServer({
  schema: buildFederatedSchema([{ typeDefs, resolvers }])
});

server.listen(4002).then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});

