/**Register Service Worker */

if (navigator.serviceWorker) {
    navigator.serviceWorker.register("/sw.js").then(function(){
        console.log('Registration worked!');
      }).catch(function() {
        console.log('Registration failed!');
      });
}

