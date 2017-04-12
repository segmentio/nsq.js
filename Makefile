
test:
	@./node_modules/.bin/mocha \
		--require should \
		--bail \
		--timeout 20s \
		test/unit/*.js \
		test/acceptance/*.js

.PHONY: test
