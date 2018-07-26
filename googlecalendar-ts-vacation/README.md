# Google Calendar Provider

This is an example of a dynamic resource provider for Google Calendar and app that demonstrates using it to manage a shared team vacation calendar, because why not do this with code?

# Credentials

TODO explain how to get credentials

```bash
# Set credentials
$ export GOOGLE_APPLICATION_CREDENTIALS=/local/path/to/credentials.json

# Create and configure a new stack
$ pulumi stack init vacationcalendar-dev

# Install dependencies
$ npm install

# Compile the TypeScript program
$ npm run build

# Preview and run the deployment
$ pulumi update

# Remove the app
$ pulumi destroy
```
