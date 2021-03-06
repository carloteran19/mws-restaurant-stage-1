/**
 * Common database helper functions.
 */

class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Setup IDB
   */
  
   // Create IDB with 'restaurants' object store = restaurantsTable 
   // Create Reviews object store = reviewsTable

  static idbSetup() { 
    return idb.open('mws-restaurant-reviews', 2, function(upgradeDb) {
      switch(upgradeDb.oldVersion){
        case 0:
        var restaurantTable = upgradeDb.createObjectStore('restaurants', { keyPath: 'id'});
        case 1:
        const reviewsTable = upgradeDb.createObjectStore('reviews', {keyPath: 'id'});
        reviewsTable.createIndex('restaurant', 'restaurant_id'); 
      }
    });
  }
  
  // Fetch Restaurants and Store them on IDB

  static GetAndPutRestaurants() {
    let fetchURL = DBHelper.DATABASE_URL; 

    return fetch(fetchURL)
      .then(response => response.json())
      .then(restaurants => {
        return DBHelper.idbSetup()
          .then(db => {
            var tx = db.transaction('restaurants', 'readwrite');
            var restaurantTable = tx.objectStore('restaurants');
            restaurants.forEach(restaurant => {
              restaurantTable.put(restaurant)
            })
            return tx.complete.then(() => Promise.resolve(restaurants));
          });
      });
  }
 
  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    // Get restaurants from IDB 
    return DBHelper.idbSetup() 
      .then(db => {
        var tx = db.transaction('restaurants');
        var restaurantTable = tx.objectStore('restaurants');
        return restaurantTable.getAll(); 
      })
      .then(restaurants => {
        if (restaurants.length) {
          return Promise.resolve(restaurants); //If Restaurants exist on IDB return them.
        }
        return DBHelper.GetAndPutRestaurants(); //IF IDB is empty, Fetch them and Store them
      })
      .then(restaurants => {
        callback(null, restaurants);
      })
      .catch(error => {
        callback(error, null)
      })
  }
  
  /**
   * Fetch Restaurant Reviews.
   */
  static fetchReviewsByRestaurantId(id) {
    return fetch(`http://localhost:1337/reviews/?restaurant_id=${id}`).then(response => {
      return response.json();
    }).then(reviews => {
      //If succesfully fetched: Store on idb
     this.idbSetup().then(db => {
       if (!db) return;

       var tx = db.transaction('reviews', 'readwrite');
       const store = tx.objectStore('reviews');
       if (Array.isArray(reviews)) {
         reviews.forEach(function(review) {
           store.put(review);
         });
       } else {
         store.put(reviews);
       }
     });
     return Promise.resolve(reviews);
    
     //if offline or there is some network error
    }).catch(networkError => {
      //get reviews from idb
      return this.idbSetup().then(function(db) {
        if (!db) return; 

        const storeObject = db.transaction('reviews').objectStore('reviews');
        const indexId = storeObject.index('restaurant');
        return indexId.getAll(id);
      }).then((storedReviews) => {
        return Promise.resolve(storedReviews);   
      }) 
    });
  }
  
  /**
   * Add New Review to DB.
   */
  static addReview(review) {
    //User is able to add a review to a restaurant while offline. 
    //Review is sent to the server when connectivity is re-established
    
    //Form submission works properly and adds a new review to the DB
    //Prepare Fetch with proper settings
    const fetch_settings = {
      method: 'POST',
      body: JSON.stringify(review)
    };
    
    //Fetch POST review to Server
    fetch(`http://localhost:1337/reviews/`, fetch_settings).then(response => {
      if (!response.ok) {
        return response.json();
      } else { return 'Review Added to DB'}})
      .then((data) => {console.log(`Fetch succesful!`)})
      .catch(error => console.log('error:', error));
  }

   /**
   * Update Restaurant status.
   */ 
  static likeRestaurant(restaurant, status) {
    console.log('changing status', status);

    fetch(`http://localhost:1337/restaurants/${restaurant}/?is_favorite=${status}`, {
      method: 'PUT'
    }).then(() => {
      DBHelper.idbSetup().then(db => {
        var tx = db.transaction('restaurants', 'readwrite');
        var restaurantTable = tx.objectStore('restaurants');
        restaurantTable.get(restaurant).then(restaurant => {
          restaurant.is_favorite = status;
          restaurantTable.put(restaurant);
        }); 
      })
    })
  }
    
  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }
  
  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.id}`);
  }

  /**
   * Map marker for a restaurant.
   */
   static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(newMap);
    return marker;
  } 
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

}

