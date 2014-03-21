[![Build Status](https://circleci.com/gh/segmentio/nsq.js.png?circle-token=cedaa77bf0b26477c0ccf9bda78db2233cb08b18)](https://circleci.com/gh/segmentio/nsq.js)
# nsq.js

  JavaScript NSQ client WIP.

## Features

  - actually written in js :p
  - easier debugging via [debug()](https://github.com/visionmedia/debug) instrumentation
  - native json message support
  - does not arbitrarily apply backoff on requeues
  - does not distribute max-in-flight
  - reconnection to dead nsqd nodes

## Installation

```
$ npm install nsq.js
```

## About

### Debugging

  The __DEBUG__ environment variable can be used to enable
  traces within the module, for example all nsq debug() calls
  except fo the framer:

```
$ DEBUG=nsq*,-nsq:framer node test

nsq:reader connect nsqd 0.0.0.0:4150 events/ingestion [5] +0ms
nsq:connection connect: 0.0.0.0:4150 V2 +0ms
nsq:connection command: IDENTIFY null +2ms
nsq:connection command: SUB ["events","ingestion"] +1ms
nsq:connection command: RDY [5] +0ms
nsq:connection connect: undefined:4150 V2 +0ms
nsq:connection command: IDENTIFY null +1ms
nsq:connection command: PUB ["events"] +0ms
nsq:reconnect reset backoff +0ms
nsq:reconnect reset backoff +1ms
nsq:connection response OK +3ms
nsq:connection response OK +0ms
nsq:connection response OK +0ms
```

### Requeue backoff

  The NSQD documentation recommends applying
  backoff when requeueing implying that the
  consumer is faulty, IMO this is a weird default,
  and the opposite of what we need so it's not applied in
  this client.

### Max in-flight distribution

  The NSQD documentation recommends attempting to
  evenly distribute the max-in-flight __RDY__ count
  to all connections, but only is this complicated to
  enforce properly when connections are introduced, dropped,
  overwhelmed, underwhelmed and so on - it introduced a
  non-deterministic behaviour. We don't need a strict
  max-in-flight cap so this library does not implement this
  behaviour (for now), when you pass `.maxInFlight` it is _per_ connection.

  This may change in the future depending on our use-cases, making it a non-default
  option would be better (if anything).

## Example

```js
var nsq = require('nsq.js');

// subscribe

var reader = nsq.reader({
  nsqd: [':4150'],
  maxInFlight: 1,
  maxAttempts: 5,
  topic: 'events',
  channel: 'ingestion'
});

reader.on('error', function(err){
  console.log(err.stack);
});

reader.on('message', function(msg){
  var body = msg.body.toString();
  console.log('%s attempts=%s', body, msg.attempts);
  msg.requeue(2000);
});

reader.on('discard', function(msg){
  var body = msg.body.toString();
  console.log('giving up on %s', body);
  msg.finish();
});

// publish

var writer = nsq.writer(':4150');

writer.publish('events', 'foo');
writer.publish('events', 'bar');
writer.publish('events', 'baz');
```

## API

### nsq.reader(options)

  Create a reader:

- `topic` topic name
- `channel` channel name
- `nsqd` array of nsqd addresses
- `nsqlookupd` array of nsqlookupd addresses
- `maxInFlight` max messages _per_ connection [1]
- `maxAttempts` max attempts before discarding [5]

Events:

- `message` (msg) incoming message
- `discard` (msg) discarded message
- `error response` (err) response from nsq
- `error` (err)

### nsq.writer([options|address])

  Create a writer. By default a connection attempt to 0.0.0.0:4150 will be made unless one of the following options are provided:

 - `port` number
 - `host` name
 - `nsqd` array of nsqd addresses
 - `nsqlookupd` array of nsqlookupd addresses

Events:

 - `error response` (err) response from nsq
 - `error` (err)

#### nsq.publish(topic, message, [fn])

 Publish the given `message` to `topic` where `message`
 may be a string, buffer, or object.

## Message

 A single message.

### Message#finish()

  Mark message as complete.

### Message#requeue([delay])

  Re-queue the message immediately, or with the
  given `delay` in milliseconds.

### Message#touch()

  Reset the message's timeout, increasing the length
  of time before NSQD considers it timed out.

### Message#json()

  Return parsed JSON object.

## Running tests

```
$ nsqd --lookupd-tcp-address=0.0.0.0:4160 &
$ nsqlookupd &
$ make test
```

# License

  MIT
