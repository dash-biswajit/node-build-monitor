var request = require('request'),
    async = require('async');

module.exports = function () {
    var self = this,
        requestBuilds = function (callback) {
            request({
                'url': 'https://api.' + self.configuration.url + '/repos/' + self.configuration.slug + '/builds?access_token=' + self.configuration.token,
                'json' : true
                },
                function(error, response, body) {
                    callback(error, body);
            });
        },
        requestBuild = function (build, callback) {
            request({
                'url': 'https://api.' + self.configuration.url + '/repos/' + self.configuration.slug + '/builds/' + build.id + '?access_token=' + self.configuration.token,
                'json' : true
                },
                function(error, response, body) {
                  if (error) {
                    callback(error);
                    return;
                  }

                  callback(error, simplifyBuild(body));
                });
        },
        queryBuilds = function (callback) {
            requestBuilds(function (error, body) {
                if (error) {
                  callback(error);
                  return;
                }

                async.map(body, requestBuild, function (error, results) {
                    callback(error, results);
                });
            });
        },
        parseDate = function (dateAsString) {
            return new Date(dateAsString);
        },
        getStatus = function (result, state) {
            if (state === 'started') return "Blue";
            if (state === 'created') return "Blue";
            if (state === 'canceled') return "Gray";
            if (result === null || result === 1) return "Red";
            if (result === 0) return "Green";

            return null;
        },
        getColor = function(jobstatus){
            if(jobstatus === 1) return "red";
            if (jobstatus === 0) return "green";
            return "grey";
        },
        simplifyBuild = function (res) {
            for(i=0; i < res.matrix.length; i++){

            }
            androidStatus = null;
            iosStatus = null;
            if(res.matrix[0])
                androidStatus = res.matrix[0].result;
            if(res.matrix[1])
                iosStatus = res.matrix[1].result;
            if(androidStatus === null)
                androidStatus = -1;
            if(iosStatus === null)
                iosStatus = -1;    

            return {
                id: self.configuration.slug + '|' + res.number,
                //project: self.configuration.slug,
                project: res.branch,
                number: res.number,
                branch: res.branch,
                androidStatus: androidStatus,
                iosStatus: iosStatus,
                commitmessage: res.message,
                isRunning: res.state === 'started',
                startedAt: parseDate(res.started_at),
                finishedAt: parseDate(res.finished_at),
                requestedFor: res.author_name,
                status: getStatus(res.result, res.state),
                statusText: res.state,
                reason: res.event_type,
                hasErrors: false,
                hasWarnings: false,
                url: 'https://' + self.configuration.url + '/' + self.configuration.slug + '/builds/' + res.id
            };
        };

    self.configure = function (config) {
        self.configuration = config;

        self.configuration.url = self.configuration.url || 'travis-ci.org';
        self.configuration.token = self.configuration.token || '';

        if (typeof self.configuration.caPath !== 'undefined') {
            request = request.defaults({
                agentOptions: {
                    ca: require('fs').readFileSync(self.configuration.caPath).toString().split("\n\n")
                }
            });
        }
    };

    self.check = function (callback) {
        queryBuilds(callback);
    };
};
