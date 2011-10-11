var buster = require("buster");
var assert = buster.assert;
var refute = buster.refute;
var bcGroup = require("../lib/group");

buster.testCase("buster-configuration group", {
    "should create resources with root path": function (done) {
        var group = bcGroup.create({
            resources: [
                "foo.js",
                "bar.js"
            ]
        }, __dirname + "/fixtures");

        assertContainsFooAndBar(group, done);
    },

    "should get file contents as actual content": function (done) {
        var group = bcGroup.create({
            resources: [
                "foo.js"
            ]
        }, __dirname + "/fixtures");

        group.resolve().then(function () {
            group.resourceSet.getResource("/foo.js", function (err, resource) {
                refute.defined(err);
                assert.equals(resource.content, "var thisIsTheFoo = 5;");
                done();
            });
        });
    },

    "should resolve globs": function (done) {
        var group = bcGroup.create({
            resources: [
                "*.js"
            ]
        }, __dirname + "/fixtures");

        assertContainsFooAndBar(group, done);
    },

    "should add resource as object with path": function (done) {
        var group = bcGroup.create({
            resources: [
                {path:"foo.js"}
            ]
        }, __dirname + "/fixtures");

        group.resolve().then(function () {
            assert("/foo.js" in group.resourceSet.resources);
            done();
        });
    },

    "should respect custom headers": function (done) {
        var group = bcGroup.create({
            resources: [
                {path:"foo.js",headers:{"X-Foo":"Bar"}}
            ]
        }, __dirname + "/fixtures");

        group.resolve().then(function () {
            group.resourceSet.getResource("/foo.js", function (err, resource) {
                refute.defined(err);
                assert.match(resource.headers, {"X-Foo": "Bar"});
                done();
            });
        });
    },

    "should set etag": function (done) {
        var group = bcGroup.create({
            resources: [
                "foo.js"
            ]
        }, __dirname + "/fixtures");

        group.resolve().then(function () {
            group.resourceSet.getResource("/foo.js", function (err, resource) {
                refute.defined(err);
                assert("etag" in resource);
                // TODO: Should probably test more here.
                done();
            });
       });
    },

    "should fail for missing file": function (done) {
        var group = bcGroup.create({
            resources: [
                "/does/not/exist.js"
            ]
        }, __dirname + "/fixtures");

        group.resolve().then(function () {
        }, function (err) {
            assert.match(err, "ENOENT");
            assert.match(err, "/does/not/exist.js");
            done();
        });
    },

    "should add backend resource": function (done) {
        var group = bcGroup.create({
            resources: [
                {path:"foo",backend:"http://10.0.0.1/"}
            ]
        }, __dirname + "/fixtures");

        group.resolve().then(function () {
            assert("/foo" in group.resourceSet.resources);
            var resource = group.resourceSet.resources["/foo"];
            assert.equals(resource.backend, "http://10.0.0.1/");
            done();
        });
    },

    "should add combined resources": function (done) {
        var group = bcGroup.create({
            resources: [
                "foo.js",
                "bar.js",
                {path: "/bundle.js", combine: ["foo.js", "bar.js"]}
            ]
        }, __dirname + "/fixtures");

        group.resolve().then(function () {
            assert("/bundle.js" in group.resourceSet.resources);
            var resource = group.resourceSet.resources["/bundle.js"];
            assert.equals(resource.combine, ["/foo.js", "/bar.js"]);
            done();
        });
    },

    "should add combined resources with glob pattern": function (done) {
        var group = bcGroup.create({
            resources: [
                "foo.js",
                "bar.js",
                {path: "/bundle.js", combine: ["*.js"]}
            ]
        }, __dirname + "/fixtures");

        group.resolve().then(function () {
            assert(true);
            var resource = group.resourceSet.resources["/bundle.js"];
            assert.equals(resource.combine.sort(), ["/foo.js", "/bar.js"].sort());
            done();
        });
    },

    "should add resources with content for file that does not exist": function (done) {
        var group = bcGroup.create({
            resources: [
                {path:"/does-not-exist.txt", content:"Hello, World"}
            ]
        }, __dirname + "/fixtures");

        group.resolve().then(function () {
            group.resourceSet.getResource("/does-not-exist.txt", function (err, resource) {
                refute.defined(err);
                assert.equals(resource.content, "Hello, World");
                done();
            });
        });
    },

    "should add resources with content for file that exists": function (done) {
        var group = bcGroup.create({
            resources: [
                {path:"/foo.js", content:"Hello, World"}
            ]
        }, __dirname + "/fixtures");

        group.resolve().then(function () {
            group.resourceSet.getResource("/foo.js", function (err, resource) {
                refute.defined(err);
                assert.equals(resource.content, "Hello, World");
                done();
            });
        });
    },

    "should add load files to load and add them as fle resources": function (done) {
        var group = bcGroup.create({
            load: [
                "foo.js",
                "bar.js"
            ]
        }, __dirname + "/fixtures");

        assertContainsFooAndBar(group, done, function (done) {
            assert.equals(["/foo.js", "/bar.js"].sort(), group.resourceSet.load.sort());
            done();
        });
    },

    "should add load files via glob pattern": function (done) {
        var group = bcGroup.create({
            load: [
                "*.js"
            ]
        }, __dirname + "/fixtures");

        assertContainsFooAndBar(group, done, function (done) {
            assert.equals(["/foo.js", "/bar.js"].sort(), group.resourceSet.load.sort());
            done();
        });
    },

    "should load sources libs and tests in right order with globbing": function (done) {
        var group = bcGroup.create({
            sources: [
                "fo*.js"
            ],
            libs: [
                "b*r.js"
            ],
            tests: [
                "test/*.js"
            ]
        }, __dirname + "/fixtures");

        assertContainsFooAndBar(group, done, function (done) {
            assert.equals(["/foo.js", "/bar.js", "/test/my-testish.js"], group.resourceSet.load);

            assert("/test/my-testish.js" in group.resourceSet.resources);
            group.resourceSet.getResource("/test/my-testish.js", function (err, resource) {
                refute.defined(err);
                assert.equals(resource.content, "{};");
                done();
            });
        });
    },

    "should load sources deps and specs in right order": function (done) {
        var group = bcGroup.create({
            sources: [
                "fo*.js"
            ],
            deps: [
                "b*r.js"
            ],
            specs: [
                "test/*.js"
            ]
        }, __dirname + "/fixtures");

        assertContainsFooAndBar(group, done, function (done) {
            assert.equals(["/foo.js", "/bar.js", "/test/my-testish.js"], group.resourceSet.load);
            
            assert("/test/my-testish.js" in group.resourceSet.resources);
            group.resourceSet.getResource("/test/my-testish.js", function (err, resource) {
                refute.defined(err);
                assert.equals(resource.content, "{};");
                done();
            });
        });
    },

    "should parse server address": function () {
        var group = bcGroup.create({
            server: "http://localhost:1234/buster"
        }, __dirname + "/fixtures");

        assert.match(group.server, {
            hostname: "localhost",
            port: 1234,
            pathname: "/buster"
        });
    },

    "should parse server address without path": function () {
        var group = bcGroup.create({
            server: "http://localhost:1234"
        }, __dirname + "/fixtures");

        assert.match(group.server, {
            hostname: "localhost",
            port: 1234,
            pathname: "/"
        });
    },

    "should provide list of all items in load with absolute pahts": function (done) {
        var group = bcGroup.create({
            load: [
                "foo.js",
                "bar.js"
            ]
        }, __dirname + "/fixtures");

        group.resolve().then(function () {
            var expected = [__dirname + "/fixtures/foo.js", __dirname + "/fixtures/bar.js"];
            assert.equals(group.absoluteLoadEntries, expected);
            done();
        });
    },

    "should set environment": function () {
        var group = bcGroup.create({
            environment: "node"
        }, __dirname + "/fixtures");

        assert.equals(group.environment, "node");
    },

    "should default environment to browser": function () {
        var group = bcGroup.create({
        }, __dirname + "/fixtures");

        assert.equals(group.environment, "browser");
    },

    "should set environment via env shorthand": function () {
        var group = bcGroup.create({
            env: "node"
        }, __dirname + "/fixtures");

        assert.equals(group.environment, "node");
    },

    "shold support duplicate items in 'load'": function (done) {
        // Useful for stuff like ["lib/must-be-first.js", "lib/*.js"]
        var group = bcGroup.create({
            load: [
                "foo.js",
                "foo.js",
                "*.js",
            ]
        }, __dirname + "/fixtures");

        assertContainsFooAndBar(group, done);
    },

    "should add bundle groups for framework resources": function (done) {
        var group = bcGroup.create({
            load: [
                "foo.js"
            ]
        }, __dirname + "/fixtures");

        group.resolve().then(function () {
            group.setupFrameworkResources();

            var bundleResourceName = "/buster/bundle-" + group.VERSION + ".js";
            var bundleResource = group.resourceSet.resources[bundleResourceName];
            assert.defined(bundleResource);

            var compatResourceName = "/buster/compat-" + group.VERSION + ".js";
            var compatResource = group.resourceSet.resources[compatResourceName];
            assert.defined(compatResource);

            assert.equals([bundleResourceName, compatResourceName], group.resourceSet.load.slice(0, 2));

            done();
        });
    }
});



function assertContainsFooAndBar(group, done, extrasCallback) {
    group.resolve().then(function () {
        assert("/foo.js" in group.resourceSet.resources);
        assert("/bar.js" in group.resourceSet.resources);

        group.resourceSet.getResource("/foo.js", function (err, resource) {
            refute.defined(err);
            assert.equals(resource.content, "var thisIsTheFoo = 5;");
            group.resourceSet.getResource("/bar.js", function (err, resource) {
                refute.defined(err);
                assert.equals(resource.content, "var helloFromBar = 1;");
                if (extrasCallback) {
                    extrasCallback(done);
                } else {
                    done();
                }
            });
        });
    });
}