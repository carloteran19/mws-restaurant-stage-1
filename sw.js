var staticCacheName = 'mws-static-v1';

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(staticCacheName).then(function(cache) {
            return cache.addAll([
                'index.html',
                'restaurant.html',
                'manifest.json',
                '/css/styles.css',
                '/js/dbhelper.js',
                '/js/idb-keyval.js',
                '/js/idb.js',
                '/js/main.js',
                '/js/restaurant_info.js',
                '/img',
                '/js/register.js'
            ]).catch(error => {
              console.log('Caches failed' + error);
            });
        })
    );
});

self.addEventListener('activate', function(event){
    event.waitUntil(
      caches.keys().then(function(cacheNames) {
          return Promise.all(
            cacheNames.filter(function(cacheName) {
                return cacheName.startsWith('mws-')&&
                       cacheName != staticCacheName;
              }).map(function(cacheName){
                  return caches.delete(cacheName);
              }) 
          );
      })
    );
})

// taken from Progressive Web Apps by Dean Alan Hume
// Add an event listener to the sync event
importScripts('/js/idb-keyval.js');
self.addEventListener('sync', (event) => {
    if (event.tag == 'sync-review') {
        event.waitUntil (
            idbKeyval.get('sendReview').then(value =>
                fetch(`http://localhost:1337/reviews/`, {
                    method: 'POST',
                    headers: new Headers({ 'content-type': 'application/json' }),
                    body: JSON.stringify(value)
                })));
            idbKeyval.del('sendReview');
    }
});

// The PUT method was failing using the previous method. I will use the following
// https://developers.google.com/web/ilt/pwa/caching-files-with-service-worker
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});

//Cache any new resources as they are fetched 
//This was taken from Progressive Web Apps by Dean Alan Hume page. 44
/*
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true })
        .then(function(response) {
            if (response) {
                return response;
            }
            var requestToCache = event.request.clone();

            return fetch(requestToCache).then(
                function(response) {
                    if(!response || response.status !== 200) {
                        return response; 
                    }
                    var responseToCache = response.clone();
                    caches.open(staticCacheName)
                    .then(function(cache) {
                        cache.put(requestToCache, responseToCache);
                    });
                    return response;
            });
        })
    );
});
*/ 