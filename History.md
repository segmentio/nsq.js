
0.14.3 / 2015-07-10
==================

  * conn: ignore all writes after the connection is closed

0.14.0 / 2015-06-22
==================

  * Add support for ephemeral topics

0.13.2 / 2015-06-10
===================

  * connection: fix callbacks leak

0.13.0 / 2015-06-03
===================

  * connection: fix maxAttempts=1 case
  * fix global
  * make npm test work

0.12.8 / 2015-04-29
===================

  * add reader polling timer tests
  * remove Reader.closing
  * setting reader's 'timer' attribute
  * connection: fix socket errors after destroy

0.12.7 / 2015-04-08
===================

 * fix: publishing of buffers

0.12.6 / 2014-11-14
==================

 * fix: reader close prevented when no connections have been made.

0.12.5 / 2014-10-28
===================

  * ignore assets

0.12.4 / 2014-10-16
===================

  * add: invalid connection error for debugging a connection state bug.
  * add: error handling when indentify() fails.

0.12.3 / 2014-10-06
===================

  * fix: integration command callback into socket.write callback.
  * change: swap out bignum implementations.

0.12.2 / 2014-10-01
===================

  * fix: use process.nextTick() to keep older node deploys happy.

0.12.1 / 2014-10-01
===================

  * fix: call msgs.finish() on "discarded" messages

0.12.0 / 2014-09-29
===================

  * fix: prevent lookupd polling from reconnecting after a close().
  * docs: close methods.
  * add: writer.close() callback.

0.11.3 / 2014-09-01
===================

  * add: support for "client_id".
  * fix: allow topic length up to 64, not 33.
  * fix: remove old connections when they are no longer returned from nsqlookupd.

0.11.2 / 2014-06-21
==================

 * change: dont RDY when .autoready == false

0.11.1 / 2014-06-20
==================

 * add Message#toJSON()
 * add: mark ._ready as false on socket error
 * fix multiple callbacks when socket errors occur

0.11.0 / 2014-05-13
==================

 * add maxConnectionAttempts option. Closes #27

0.10.1 / 2014-05-05
==================

 * fix ready mixin

0.10.0 / 2014-04-24
==================

 * add quick-n-dirty rdy distribution
 * add jstrace probes and examples. Closes #24

0.9.1 / 2014-04-10
==================

 * fix clobbering of .ready()

0.9.0 / 2014-04-10
==================

 * add ready: false support for disabling auto-RDY

0.8.1 / 2014-04-02
==================

 * add error.address

0.8.0 / 2014-03-25
==================

 * add Reader#ready(n)

0.7.1 / 2014-03-24
==================

 * fix graceful close case when no messages are in-flight

0.7.0 / 2014-03-24
==================

 * add graceful close support. Closes #14
 * add ms() support to .requeue(). Closes #22
 * add pre-0.11.x friendly msg.inspect(). Closes #20
 * add MPUB support. Closes #6
 * add CI support
 * add reader delegation of "ready" event
 * move delegate to utils.js
 * move mixins to lib/mixins

0.6.0 / 2014-03-18
==================

 * add .pause() and .resume() support

0.5.1 / 2014-03-17
==================

 * fix: add quick-n-dirty ready state check to response methods
 * fix IDENTIFY race: use "close" instead of "error" for reconnection

0.5.0 / 2014-03-15
==================

 * add Message#timedout()

0.4.1 / 2014-03-12
==================

 * fix maxAttempts Infinity default. Closes #18

0.4.0 / 2014-03-11
==================

 * add .nsqd and .nsqlookupd pooling support to Writer
 * add "error" event to writer

0.3.1 / 2014-03-10
==================

 * bump to try and get npm working

0.3.0 / 2014-03-10
==================

 * add tests
 * add errors.js example
 * add Reader#close()
 * add "error response" event delegation
 * add Connection host/port defaults
 * add noop error handler to Writer, let callbacks handle it
 * add "reconnect" event. Closes #8
 * add Connection#addr
 * fix writer error broadcasting pre-connection
 * fix Connection#close()
 * fix error emission
 * remove Message method callbacks for commands which only reply on error. Closes #12

0.2.0 / 2014-03-08
==================

 * add better connection error messages because node is retarded
 * add ready interval just to be safe
 * remove empty buffer possibly causing framing issues (at least on 0.8.x)

0.1.4 / 2014-03-04
==================

 * fix re-subscription on reconnect

0.1.3 / 2014-03-04
==================

 * change response errors to emit "error response"

0.1.2 / 2014-03-03
==================

 * fix error reply emission

0.1.1 / 2014-02-27
==================

 * fix callback bug of doom
 * fix: invoke remaining callbacks on socket error

0.1.0 / 2014-02-25
==================

 * add support for session-specific .msg_timeout

0.0.5 / 2014-02-19
==================

 * fix parsing of features

0.0.4 / 2014-02-19
==================

 * add Message#timeUntilTimeout()
 * add feature negotiation
 * add hostname for .short_id / .long_id

0.0.3 / 2014-02-19
==================

 * add more debug()s
 * fix buffer offset for node 0.10.x
