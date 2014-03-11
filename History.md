
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
