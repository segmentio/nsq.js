# nsq.js

  JavaScript NSQ client WIP.

## Features

  - actually written in js :p
  - easier debugging via [debug()](https://github.com/visionmedia/debug) instrumentation
  - native json message support
  - does not arbitrarily apply backoff on requeues
  - disabling of auto-RDY support for manual control (high throughput etc)
  - reconnection to dead nsqd nodes
  - graceful close support

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

writer.on('ready', function() {
  writer.publish('events', 'foo');
  writer.publish('events', 'bar');
  writer.publish('events', 'baz');
});
```

## API

### nsq.reader(options)

  Create a reader:

- `id` connection identifier *(see `client_id` in the [spec](http://nsq.io/clients/tcp_protocol_spec.html#identify))*
- `topic` topic name
- `channel` channel name
- `nsqd` array of nsqd addresses
- `nsqlookupd` array of nsqlookupd addresses
- `maxAttempts` max attempts before discarding [Infinity]
- `maxConnectionAttempts` max reconnection attempts [Infinity]
- `maxInFlight` max messages distributed across connections [10]
- `msgTimeout` session-specific msg timeout
- `pollInterval` nsqlookupd poll interval[10000]
- `ready` when `false` auto-RDY maintenance will be disabled
- `trace` trace function

Events:

- `message` (msg) incoming message
- `discard` (msg) discarded message
- `error response` (err) response from nsq
- `error` (err)

### reader#close([fn])
Close the reader's connection(s) and fire the optional [fn] when completed.

### nsq.writer([options|address])

  Create a writer. By default a connection attempt to 0.0.0.0:4150 will be made unless one of the following options are provided:

 - `port` number
 - `host` name
 - `nsqd` array of nsqd addresses
 - `nsqlookupd` array of nsqlookupd addresses

Events:

 - `error response` (err) response from nsq
 - `error` (err)

### writer#publish(topic, message, [fn])

 Publish the given `message` to `topic` where `message`
 may be a string, buffer, or object. An array of messages
 may be passed, in which case a MPUT is performed.

### writer#close([fn])
Close the writer's connection(s) and fire the optional [fn] when completed.

## Message

 A single message.

### Message#finish()

  Mark message as complete.

### Message#requeue([delay])

  Re-queue the message immediately, or with the
  given `delay` in milliseconds, or a string such
  as "5s", "10m" etc.

### Message#touch()

  Reset the message's timeout, increasing the length
  of time before NSQD considers it timed out.

### Message#json()

  Return parsed JSON object.

## Tracing

 The following [jstrace](https://github.com/jstrace/jstrace) probes are available:

- `connection:ready` ready count sent
- `connection:message` message received
- `message:finish` finished a message
- `message:requeue` requeued a message
- `message:touch` touched a message

## Running tests

```
nsqd --lookupd-tcp-address=0.0.0.0:4160 &
nsqadmin --lookupd-http-address=0.0.0.0:4161 &
nsqlookupd &
make test
```

# License

  MIT
