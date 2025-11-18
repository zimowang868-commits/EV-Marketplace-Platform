"use strict";

(function() {
  window.addEventListener("load", init);

  let curVehicle;
  let userId;
  let recommendations;

  /**
   * Set up necessary functionality when page loads
   */
  function init() {
    showMain();
    id("sign-in-button").addEventListener("click", showSignIn);
    id("home-button").addEventListener("click", showMain);
    id("submit-button").addEventListener("click", signIn);
    id("column-layout").addEventListener("click", makeColumns);
    id("row-layout").addEventListener("click", makeRows);
    id("search-button").addEventListener("click", searchAndFilter);
    id("purchase-button").addEventListener("click", showSignIn);
    id("submit-review-button").addEventListener("click", showSignIn);

    requestAllVehicles();
  }

  /**
   * Shows the specified view while hiding all other views.
   * @param {string} viewId - The ID of the view to be shown.
   */
  function showView(viewId) {
    const views = qsa(".view");
    views.forEach(view => {
      if (view.id === viewId) {
        view.classList.remove("hidden");
      } else {
        view.classList.add("hidden");
      }
    });
  }

  /**
   * Shows the detailed view.
   */
  function showDetailed() {
    showView('vehicle-details');
  }

  /**
   * Shows the user section and populates the recommended section.
   */
  function showUser() {
    populateRecommended(recommendations);
    showView('user-section');
  }

  /**
   * Shows the sign-in section.
   */
  function showSignIn() {
    showView('sign-in-section');
  }

  /**
   * Clears the recommended section, requests all vehicles, and shows the main view.
   */
  function showMain() {
    const recommendationSection = id('recommended-section');
    recommendationSection.innerHTML = '';
    requestAllVehicles();
    showView('main-view');
  }

  /**
   * Requests the API endpoint to get all vehicles
   */
  function requestAllVehicles() {
    fetch('/vehicles')
      .then(statusCheck)
      .then(res => res.json())
      .then(processVehicles)
      .catch(handleError);
  }

  /**
   * Processes the vehicles received from the server and updates the DOM.
   * @param {Object} res - The vehicle data received from the server.
   */
  function processVehicles(res) {
    const lists = qsa('.vehicle-list');
    for (const list of lists) {
      list.innerHTML = '';
    }
    for (const vehicle of res) {
      const category = vehicle.tags.split(',')[0];
      const article = id(category);
      const vehicleDiv = createVehicleDiv(vehicle);
      const vId = vehicleDiv.id;
      article.appendChild(vehicleDiv);
      vehicleDiv.addEventListener('click', () => reqVehicleDetails(vId));
    }
  }

  /**
   * Creates a div element to display the details of a vehicle.
   * @param {Object} vehicle - The vehicle object containing details to be displayed.
   * @returns {HTMLElement} The div element representing the vehicle details.
   */
  function createVehicleDiv(vehicle) {
    const vehicleContainer = gen('div');
    vehicleContainer.classList.add('vehicle');

    const image = gen('img');
    image.src = `img/${vehicle.image_url}`;
    image.alt = `picture of ${vehicle.model_name}`;
    image.classList.add('vehicle-image');

    const infoDiv = gen('div');
    infoDiv.classList.add('vehicle-info');

    const nameHeading = gen('h5');
    nameHeading.classList.add('vehicle-name');
    nameHeading.textContent = vehicle.model_name;
    infoDiv.appendChild(nameHeading);

    const priceParagraph = gen('p');
    priceParagraph.classList.add('vehicle-price');
    priceParagraph.textContent = `$${vehicle.price.toLocaleString()}`;
    infoDiv.appendChild(priceParagraph);

    const rating = vehicle.rating || '-';
    const ratingParagraph = gen('p');
    ratingParagraph.classList.add('vehicle-rating');
    ratingParagraph.textContent = `Rating: ${rating}/5`;
    infoDiv.appendChild(ratingParagraph);

    vehicleContainer.appendChild(image);
    vehicleContainer.appendChild(infoDiv);

    vehicleContainer.id = vehicle.vehicle_id;

    return vehicleContainer;
  }

  /**
   * Searches and filters
   */
  function searchAndFilter() {
    const searchTerm = id('search-input').value;
    const selectedTags = Array.from(qsa('input[type="radio"]:checked'))
      .map(radio => radio.value);
    const queryString = new URLSearchParams({
      qry: searchTerm,
      filters: selectedTags.join(',')
    }).toString();

    fetch(`/vehicles?${queryString}`)
      .then(statusCheck)
      .then(res => res.json())
      .then(processVehicles)
      .catch(handleError);
  }

  /**
   * This function will handle the sign in logic, that is, let the user
   * to input their username/email and their password and then click sign in
   * botton at the bottom to sign in the account.
   */
  function signIn() {
    const username = id("username").value;
    const password = id("password").value;
    fetch('/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({username, password})
    })
      .then(statusCheck)
      .then(res => res.json())
      .then(res => processUser(res, username))
      .catch(handleError);
  }

  /**
   * Processes the user data received from the server and updates the DOM.
   * @param {Object} res - The response object containing user data.
   * @param {string} username - The username of the user.
   */
  function processUser(res, username) {
    userId = res.userId;
    recommendations = res.recommendations;
    const transactions = res.transactions;
    const usernameDisplay = id('username-display');
    const trxList = id('transactions-list');

    usernameDisplay.textContent = username;
    trxList.innerHTML = '';
    if (transactions) {
      transactions.forEach(transaction => {
        const trxItem = gen('li');
        trxItem.classList.add('transaction-item');

        const trxDetails = gen('p');
        trxDetails.classList.add('transaction-details');
        trxDetails.textContent = `${transaction.date}: Purchased ${transaction.vehicle_name}
          (Confirmation #: ${transaction.confirmation_number})`;
        trxItem.appendChild(trxDetails);
        trxList.appendChild(trxItem);
      });
    }

    showUser();

    handleSignIn(username);
  }

  /**
   * Handles the sign-in process for a user and updates UI elements accordingly.
   *
   * @param {string} user - The username of the signed-in user.
   */
  function handleSignIn(user) {
    const userBtnText = id('user-btn-text');
    userBtnText.textContent = user;
    const userBtn = id('sign-in-button');
    userBtn.removeEventListener('click', showSignIn);
    userBtn.addEventListener('click', showUser);
    const purchaseBtn = id('purchase-button');
    purchaseBtn.removeEventListener('click', showSignIn);
    purchaseBtn.addEventListener('click', askToConfirm);
    const postBtn = id('submit-review-button');
    postBtn.removeEventListener('click', showSignIn);
    postBtn.addEventListener('click', postReview);
  }

  /**
   * Posts a review to the server using a fetch request.
   */
  function postReview() {
    const reviewText = id('review-text').value;
    const rating = qs('input[name="rating"]:checked').value;
    fetch('/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: userId,
        vehicleId: curVehicle,
        rating: rating,
        reviewText: reviewText
      })
    })
      .then(statusCheck)
      .then(res => res.text())
      .then(handleConfirm)
      .catch(handleError);
  }

  /**
   * Handles the confirmation of a user's action and updates the UI accordingly.
   *
   * @param {string} res - The response from the server confirmation.
   */
  function handleConfirm(res) {
    reqVehicleDetails(curVehicle);
    const confirmationDiv = gen('div');
    confirmationDiv.textContent = `${res}`;
    const container = id('confirmation');
    container.innerHTML = '';
    container.appendChild(confirmationDiv);
  }

  /**
   * Asks the user to confirm their action and updates UI elements accordingly.
   */
  function askToConfirm() {
    this.removeEventListener('click', showSignIn);
    this.addEventListener('click', askToSubmit);
    const purchaseBtnText = qs('#purchase-button p');
    purchaseBtnText.textContent = 'Confirm?';
  }

  /**
   * Asks the user to submit their action and updates UI elements accordingly.
   */
  function askToSubmit() {
    const purchaseBtnText = qs('#purchase-button p');
    purchaseBtnText.textContent = 'Submit';
    this.removeEventListener('click', askToConfirm);
    this.addEventListener('click', submitOrder);
  }

  /**
   * Submits an order to the server using a fetch request.
   */
  function submitOrder() {
    fetch('/purchase', {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        vehicleId: curVehicle
      })
    })
      .then(statusCheck)
      .then(res => res.text())
      .then(handlePurchase)
      .catch(handleError);
  }

  /**
   * Handles the response from the server after a successful purchase.
   *
   * @param {string} res - The response from the server after the purchase.
   */
  function handlePurchase(res) {
    const purchase = id('purchase-button');
    purchase.removeEventListener('click', submitOrder);
    purchase.addEventListener('click', askToConfirm);
    const purchaseBtnText = qs('#purchase-button p');
    purchaseBtnText.textContent = 'Purchase';
    const confirmationDiv = gen('div');
    confirmationDiv.textContent = `Your order has been submitted!
      Your confirmation number is ${res}.`;
    const container = id('confirmation');
    container.innerHTML = '';
    container.appendChild(confirmationDiv);
  }

  /**
   * Populates the recommended section with recommended vehicles.
   *
   * @param {Array} recs - An array of recommended vehicles.
   */
  function populateRecommended(recs) {
    if (recs) {
      const recommendationSection = id('recommended-section');
      recommendationSection.innerHTML = '';
      const recommendationList = gen('article');
      recommendationList.classList.add('category');
      const header = gen('h4');
      header.textContent = 'Recommended';
      const listDiv = gen('div');
      listDiv.id = 'recommended';
      listDiv.classList.add('vehicle-list');

      recommendationList.appendChild(header);
      for (const rec of recs) {
        const vId = rec.vehicle_id;
        const card = id(vId);
        const parent = rec.tags.split(',')[0];
        id(parent).removeChild(card);
        listDiv.appendChild(card);
      }
      recommendationList.appendChild(listDiv);
      recommendationSection.appendChild(recommendationList);
    }
  }

  /**
   * Requests and processes details for a specific vehicle from the server.
   *
   * @param {number} vId - The ID of the vehicle to retrieve details for.
   */
  function reqVehicleDetails(vId) {
    id('confirmation').innerHTML = '';
    curVehicle = vId;
    fetch(`/vehicle/${vId}`)
      .then(statusCheck)
      .then(res => res.json())
      .then(processVehicleDetails)
      .catch(handleError);
  }

  /**
   * Processes the details of a vehicle and updates the UI accordingly.
   *
   * @param {object} res - The response containing vehicle information and feedback data.
   */
  function processVehicleDetails(res) {
    const info = res.vehicleInfo;
    const rev = res.feedbackData;
    const detailsImage = id('details-image');
    const detailName = id('detail-name');
    const detailRating = id('detail-rating');
    const detailPrice = id('detail-price');
    const detailDescription = id('detail-description');

    const rating = rev.averageRating || '-';
    detailsImage.src = `img/${info.image_url}`;
    detailsImage.alt = info.model_name;
    detailName.textContent = info.model_name;
    detailRating.textContent = `Community Rating: ${rating}/5`;
    detailPrice.textContent = `$${info.price.toLocaleString()}`;
    detailDescription.textContent = info.description;
    populateReviews(rev.reviews);
    showDetailed();
  }

  /**
   * Populates the reviews section with user reviews.
   *
   * @param {Array} reviews - An array of reviews for the vehicle.
   */
  function populateReviews(reviews) {
    const revContainer = id('other-reviews');
    revContainer.innerHTML = '';

    reviews.forEach(review => {
      const reviewDiv = gen('div');
      reviewDiv.classList.add('review');
      const username = gen('h3');
      username.textContent = review.username;

      const rating = gen('p');
      rating.textContent = `${review.rating}/5`;

      const reviewText = gen('p');
      reviewText.textContent = review.review_text;

      const date = gen('p');
      const dateSubmitted = new Date(review.date_submitted);
      const formattedDate = `${dateSubmitted.getMonth() +
        1}/${dateSubmitted.getDate()}/${dateSubmitted.getFullYear()}`;
      date.textContent = formattedDate;

      reviewDiv.appendChild(username);
      reviewDiv.appendChild(date);
      reviewDiv.appendChild(rating);
      reviewDiv.appendChild(reviewText);

      revContainer.appendChild(reviewDiv);
    });
  }

  /**
   * changes the layout of the vehicle divs to columns
   */
  function makeColumns() {
    const categoriesSection = id("vehicle-categories");
    categoriesSection.classList.add("column-layout");
    categoriesSection.classList.remove("row-layout");
    const buttons = qsa(".layout-button");
    buttons.forEach(button => button.classList.remove("selected"));
    id("column-layout").classList.add("selected");
  }

  /**
   * changes the layout of the vehicle divs to rows
   */
  function makeRows() {
    const categoriesSection = id("vehicle-categories");
    categoriesSection.classList.add("row-layout");
    categoriesSection.classList.remove("column-layout");
    const buttons = qsa(".layout-button");
    buttons.forEach(button => button.classList.remove("selected"));
    id("row-layout").classList.add("selected");
  }

  /**
   * Checks the status of the HTTP response and throws an error if not okay.
   * @param {Response} res - The HTTP response to check.
   * @returns {Promise<Response>} - The response if okay.
   * @throws {Error} - The error if the response is not okay.
   */
  async function statusCheck(res) {
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res;
  }

  /**
   * Handles errors and displays the error message in the DOM.
   * @param {Error} err - The error object containing the error message.
   */
  function handleError(err) {
    const errorMessage = document.createElement('p');
    errorMessage.textContent = err.text();
    qs('nav').appendChild(errorMessage);
  }

  /**
   * Creates and returns a new DOM element of the specified type.
   * @param {string} el - The tag name of the element to be created (e.g., 'div', 'p', 'section').
   * @returns {Element} - A new element of the specified type.
   */
  function gen(el) {
    return document.createElement(el);
  }

  /**
   * Returns first element matching selector.
   * @param {string} selector - CSS query selector.
   * @returns {object} - DOM object associated selector.
   */
  function qs(selector) {
    return document.querySelector(selector);
  }

  /**
   * Returns the array of elements that match the given CSS selector.
   * @param {string} query - CSS query selector
   * @returns {object[]} array of DOM objects matching the query.
   */
  function qsa(query) {
    return document.querySelectorAll(query);
  }

  /**
   * Returns the element that has the ID attribute with the specified value.
   * @param {string} name - element ID.
   * @returns {object} - DOM object associated with id.
   */
  function id(name) {
    return document.getElementById(name);
  }
})();