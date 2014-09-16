# coreBOS Webservice API Library for AngularJS

This AngularJS service gives us a high level abstraction layer to access all the power of the [coreBOS](https://github.com/tsolucio/corebos) application.

Following the layout defined by the rest of the [coreBOS WebService API Libraries](https://github.com/tsolucio/coreBOSwsLibrary), this project gives us API calls in the form of javascript promises to all the functionality that can be found in the coreBOS application.

Documentation on the [coreBOS WebService API can be found here](http://corebos.org/documentation/doku.php?id=en:devel:corebosws) and a full example of use can be studied in our [AngularJS coreBOS Webservice API Browser Project](https://github.com/tsolucio/coreBOSWebserviceJS).

This project is a proud member of the [coreBOS family](http://corebos.org/). Feel free to have a look and use as you may need and don't forget to come on over to [our website](http://corebos.org/) for full details of the project and follow us on [Google+](https://plus.google.com/communities/109845486286232591652) and [LinkedIn](http://www.linkedin.com/groups/coreBOS-7479130?trk=my_groups-b-grp-v) for regular updates.


How to use:
--------

####Protip: Install using Bower
```shell
bower install https://github.com/tsolucio/coreBOSWSAPIJS.git
```

####Add the JavaScript AFTER loading angularjs and before loading your main application script which will use the API
```html
<script type="text/javascript" src="js/coreBOSAPI.js"></script>
```

####Establish a connection to coreBOS with the coreBOSWSAPI.doLogin() call. For example, when loading your main application class

```
angular.module('coreBOSJSApp',
	[ ..., 'angular-md5', 'coreBOSAPIservice', ...])
...
	.run(function (coreBOSAPIStatus, coreBOSWSAPI) {
		//coreBOSWSAPI.setcoreBOSUser('your corebBOS user');
		//coreBOSWSAPI.setcoreBOSKey('your coreBOS Access key');
		coreBOSWSAPI.setURL('your coreBOS application URL');
		coreBOSWSAPI.doLogin('your corebBOS user','your coreBOS Access key').then(function() {});
	})
```

####Once you get a successful login you can call any API service and use the results in your application.


License
--------
MPL 2.0


