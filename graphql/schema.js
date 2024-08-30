const graphql = require("graphql");

// So You have to define schema in graphql and it can be defined as follows!
module.exports = graphql.buildSchema(`

    type TestData{
        text : String!
        views : Int!
    }

    type RootQuery {
        hello : TestData!
    }


    schema {
        query : RootQuery
    }
`);

// so schema has a specific stucture here first you have define main schema in that you have to call your root query , after that above main schema you have define your root query and in that you can define multple return segments and the use of "!" is defiens that this must be required
