//This file is for storing and running functions related to the fetching, parsing, and consequent filtration of the selected page's text to find the ICAO code and the destination list
//Import airport database
import airports from './airportdb.json' assert { type: "json" };;

//Create a new map with view set at zoom level 4 and centered on Europe
var map = L.map('map').setView([54.6872, 25.2797], 4);

//Add a new OSM basemap, and set its max zoom level to 18
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	subdomains: 'abcd',
	maxZoom: 18
}).addTo(map);


//create new marker icon for airports
var airportIcon = L.icon ({
  iconUrl: 'https://raw.githubusercontent.com/MartynasRB/destinations/main/icons/airport.png',
  iconSize: [43,43],
  iconAnchor: [21.5,43],
  popupAnchor: [0,-43],
})

//create new marker icon for origin airport
var originAirportIcon = L.icon ({
  iconUrl: 'https://raw.githubusercontent.com/MartynasRB/destinations/main/icons/airport_origin.png',
  iconSize: [43,43],
  iconAnchor: [21.5,43],
})

//geodetic line style options
const options = {
  weight: 2,
  opacity: 0.5,
  color: 'black',
};

//Create a dummy load counter and reset it (haven't loaded at all)
var loadCounter = 0
//Create a layer group to store layers
var layerGroup;
var lineGroup;

//Add an event listener to the airport search bar...
document
  .getElementById('airport-search')
  .addEventListener('click', function () {
    //declare variable for listing the airports on the screen
    displayList = [];
    //Create a dummy counter of airports and reset it
    countAirports = 0;
    //Get the search query written in the text box
    var input = document.getElementById('userInput').value;
    console.log(input);
    //Assign the search query value to the required variable
    var page_title = input; 
    // var t1; //declare the timing variable
    // const t0 = performance.now(); //get the time start
    //Use the search box query to render the points -> go to function...
    renderPoints(page_title);
  });

//Create a dummy variable to hold ICAO Code
var ICAOCodeExtract;

async function getICAOCode(title) {
  //the function parameter is the page title in URL-friendly format
  //main function
  //Declare fetch URL
  var url = 'https://en.wikipedia.org/w/api.php';
  url = url + '?origin=*';
  //Declare params of what to find
  var params = {
    action: 'query', //the action is to query the page contents
    prop: 'revisions', //the property is to get the latest revision of the text
    rvprop: 'content', //the revision property is the content of the revision
    rvsection: 0, //query the first section of the revision (summary/infobox)
    titles: title, //the title corresponds to the page title in URL-friendly format
    format: 'json', //give out the response in json format
    redirects: 1,
  };
  var pageData; //variable to hold the fetched json response of the page
  Object.keys(params).forEach(function (key) {
    url += '&' + key + '=' + params[key];
  }); // construct the API URL based on the params and the title

  //function to fetch the wikipedia section data from the API URL
  async function getData(url) {
    const response = await fetch(url); //fetches the url response
    const json = await response.json(); //converts the response to a json object
    return json; //gives out the json object
  }

  //function to assign fetched data to a variable
  async function assignData() {
    pageData = await getData(url); //assign the json object to the variable
  }
  //function to parse the json object and extract text
  async function parseInfobox() {
    await assignData(); //runs previous functions to get variable values
    var pages = pageData.query.pages; //looks at the pages list of the query
    var infobox; //creates variable to hold value
    for (var page in pages) {
      //runs through each pages item
      infobox = JSON.stringify(pages[page].revisions[0]); //takes the first element of the revisions property, which is the summary and infobox, and also converts it into a string
    }
    return infobox; //vomits out the string
  }
  //function to extract the ICAO code from the string
  async function extractICAO() {
    var rawText = await parseInfobox(); //assigns the string summary text from the function to a new variable
    var noSpacesText = rawText.replace(/\s+/g, ''); //removes all spaces to avoid formatting voids that ruin the RegExp
    var ICAORegExp = /ICAO=(....)/; //defines the regular expression that looks for "ICAO=" character combination and records the next 4 characters after that (the ICAO code)
    var ICAOCode = noSpacesText.match(ICAORegExp)[1]; //uses the defined regexp to find the matching characters (the ICAO code) in the string
    return ICAOCode;
  }
  ICAOCodeExtract = await extractICAO();
  return ICAOCodeExtract;
}

async function getDestinationList(title) {
  //Declare fetch URL
  var url = 'https://en.wikipedia.org/w/api.php';
  url = url + '?origin=*';

  //Declare params of what to find
  var params = {
    action: 'parse', //the action is to parse the page
    prop: 'sections', //the property of parse is to parse the section list
    page: '', //this will have to be changed to fetch sections of different pages
    format: 'json', //give out the response in json format
  };
  //declare structure of the url

  var geoData; //variable to hold the fetched json response of the page

  //function to fetch the wikipedia section data from the API URL
  async function getData(url) {
    const response = await fetch(url); //fetches the url response
    const json = await response.json(); //converts the response to a json object
    return json; //gives out the json object
  }

  //function to assign fetched data to a variable
  async function assignData() {
    geoData = await getData(url); //assign the json object to the variable
  }

  //function to parse the page and find the section index of Airlines and destinations
  async function findSectionIndex(title) {
    params.page = title; //set the title parameter of the page to the given title
    Object.keys(params).forEach(function (key) {
      url += '&' + key + '=' + params[key];
    }); // construct the API URL based on the params and the title
    await assignData(); //fetch the data from the URL
    var parseData = geoData.parse.sections; //assign the fetched section data to a variable
    for (var section in parseData) {
      //find the section that corresponds to the text and get its index
      if (parseData[section].line === 'Airlines and destinations') {
        var sectionIndex = parseInt(section) + 1; //because the index starts at 0, and sections start at 1, add 1 so that index matches the correct section
      }
    }
    return sectionIndex;
  }

  //function to get the text of the chosen section
  async function getSectionText(title) {
    var sectionText;
    var sectionIndex = await findSectionIndex(title); //variable to hold the section index
    var url_sectionText = 'https://en.wikipedia.org/w/api.php'; //create a url base part
    url_sectionText = url_sectionText + '?origin=*'; //create a url base part
    var params_sectionText = {
      //declare the parameters of parsing section text
      action: 'parse', //the action is to parse the text
      prop: 'wikitext', //the property of the action is to parse wikitext
      section: sectionIndex, //the section to parse is the index that we give it
      page: title, //this will have to be changed to fetch sections of different pages
      format: 'json', //give out a response in the json format
    };
    Object.keys(params_sectionText).forEach(function (key) {
      url_sectionText += '&' + key + '=' + params_sectionText[key];
    }); //construct the API URL using the correct section index and page title from the params_sectionText
    const response = await fetch(url_sectionText); //fetch the response using the title
    const json = await response.json(); //convert the response to json
    sectionText = json.parse.wikitext; //assing the parsed section wikitext to the variable
    return sectionText;
  }

  //function to filter the list to only keep [[ ]] bounded items (i.e. airports and airlines)
  function filterDestinations(splitWikiText) {
    return (splitWikiText[0] === '[') & (splitWikiText[1] === '[');
  }

  async function createDestinations(page_title) {
    var fetchedSectionText = await getSectionText(page_title); //fetch and assign destination section text from page
    var wikiText = JSON.stringify(fetchedSectionText); //convert section object to string
    var toListRegEx = new RegExp(/(\[\[.*?\]\])/); //define a regular expression to match group where group starts with "[[" and ends with "]]"
    var splitWikiText = wikiText.split(toListRegEx); //split the string to list items based on RegEx
    var itemsWikiText = splitWikiText.filter(filterDestinations); //filters the list and only keeps items where the items are bounded by [[ ]]
    let search = (list, text, text2) =>
      list.filter((i) => i.includes(text) || text.includes(i) || i.includes(text2) || text2.includes(i)); //creates a search filter
    var destinations = search(itemsWikiText, 'Airport', 'Airfield'); //filter the list to only keep items with Airport in their name. THIS MUST BE ADJUSTED TO DEFINE AIRLINES!!
    var unique_destinations = [...new Set(destinations)]; //remove duplicates from list
    // console.log(unique_destinations); //debug check of created list of dirty destination list

    //create an empty destination array which will be filled with objects
    var destination_array = [];

    //create unique_destinations list regular expressions to extract useful text from the string
    var urlSplit = new RegExp(/\[\[([^|]+)/); //this is extract the URL part of the string
    var nameSplit = new RegExp(/([^|]+)\]\]/); //this will extract the name part of the string

    unique_destinations.forEach(constructDestinations); //a for loop is apply for each item of the destination set, sequentially

    //function to construct an destination element in the destination object
    async function constructDestinations(item, index, arr) {
      var dest_array_url_spaces = item.match(urlSplit)[1]; //extract the URL part of the string
      var dest_array_url = dest_array_url_spaces.replaceAll(' ', '_'); //change spaces to underscores
      var dest_array_name = item.match(nameSplit)[1]; //extract the title part of the string
      destination_array.push({
        //add a new object to the destination array at the end...
        name: dest_array_name, //..where name property is the parsed and cleaned title part of the string...
        url_name: dest_array_url, //..where url property is the parsed and cleaned url part of the string...
      });
    }
    return destination_array;
  }
  //assigns the destination array to a variable
  var dests = await createDestinations(title);
  return dests;
}
//declare variable for counting the airports
var countAirports = 0;
//declare variable for listing the airports on the screen
var displayList = [];

//function to create the final list of all destination airports with their coordinates
async function createDestinationObject(title) {
  //create the list of destinations
  var destinationList = await getDestinationList(title);
  //declare variable to hold the final list
  var finalList = [];
  for (var item in destinationList) {
    //for every destination airport...
    var airport_url = destinationList[item].url_name; //...add the url name to the url property...
    var airport_icao = await getICAOCode(airport_url); //...find the ICAO code of the airport and put it in the ICAO property...
    var airport_name = destinationList[item].name; //...get the name of the airport and put it in the name property...
    displayList.push(destinationList[item].name); //...push the name of the airport to the name list for displaying on-screen...
    countAirports += 1; //...increase the counter by one...
    console.log(`Found ${countAirports} airports...`); //...log the counted airport
    document.getElementById(
      'search-objects'
    ).innerText = `Found ${countAirports} airports...`; //...display the count to calm people down...
    finalList.push({
      //add the information in the final list
      url_name: airport_url, //the url name
      ICAO: airport_icao, //the ICAO code
      name: airport_name, //the name of the airport
      latitude: 0, //placeholder for latitude
      longitude: 0, //placeholder for longitude
    });
  }
  return finalList; //vomit out the list
}

//sets a 100ms timeout on all write functions to await fetch response
// setTimeout(function () {
//   writeDestinationArray();
// }, 1000);

//writes the destination array to variable
// function writeDestinationArray() {
//   console.log(finalList);
// }

//THIS MIGHT BE HORRIBLY SLOW
// async function assignCoordinates(title) {
//   var finalList = await createDestinationObject(title);
//   for (var airport in airports) {
//     for (var destination in finalList) {
//       if (finalList[destination].ICAO === airports[airport].ident) {
//         finalList[destination].latitude = airports[airport].latitude_deg;
//         finalList[destination].longitude = airports[airport].longitude_deg;
//       }
//     }
//   }
//   console.log(finalList);
//   var t1 = performance.now();
//   console.log(`Call to assignCoordinates took ${t1 - t0} milliseconds.`);
// }

let airportsMap = Object.assign({}, ...airports.map((a) => ({ [a.ident]: a }))); //map the airports database ICAO codes

//function to assing the coordinate for each destination airport
async function assignCoordinates(title) {
  var finalList = await createDestinationObject(title); //create the final destination list
  for (let destination of finalList) {
    //for each airport of the destination list...
    if (Object.hasOwn(airportsMap, destination.ICAO)) {
      //...if the ICAO code of the list matches an ICAO code in the mapped dataset...
      const airport = airportsMap[destination.ICAO]; //...declare the ICAO code...
      destination.latitude = airport.latitude_deg; //...add the latitude of the airport to the latitude property of the list...
      destination.longitude = airport.longitude_deg; //...add the longitude of the airport to the longitude property of the list...
    }
  }
  console.log(finalList);
  return finalList; //log the updated list
  // document.getElementById(
  //   'airport-result'
  // ).innerText = `This is the list of airports: ${displayList}`; //display the names of the airports this tool found
}

async function originCoordinates(title) { //function to ge tthe coordinates of the origin airport
  var originICAO = await getICAOCode(title); //get the ICAO code of the origin airport
  var originLatitude //declare empty vars to hold coordinates
  var originLongitude
  const airport = airportsMap[originICAO]; //use the mapping of the db to the ICAO
  originLatitude = airport.latitude_deg; //assign decimal latitude 
  originLongitude = airport.longitude_deg; //assign decimal longitude
  var originCoordList = [originLatitude, originLongitude]; //create coordinate list
  return originCoordList; //vomit out list
}

//Function to run the entire function tree and display the destinations

// Creating layer group


async function renderPoints(title) {
  lineGroup = L.layerGroup([]);
  var airportList = await assignCoordinates(title); //assign the final list with coordinates to a new variable
  var originAirport = await originCoordinates(title); //assign the origin coordinates to a new variable
  var jsonFeatures = []; //create a dummy variable to hold json features 
  var originCoord = new L.LatLng(originAirport[0],originAirport[1])
  //for each object in the airport list we create a point feature
  airportList.forEach(function(point){
    var lat = point.latitude; //declare its latitude
    var lon = point.longitude; //declare its longitude
    var destinationPoint = [lat, lon];
    var geodesic = new L.Geodesic([originCoord, destinationPoint], options);
    lineGroup.addLayer(geodesic)
    //we create the feature that will have the name and the ICAO as its attributes, and will have point geometry with our coordinates...
    var feature = {type: 'Feature',
        properties: {
            'name': point.name,
            "ICAO": point.ICAO,
        },
        geometry: {
            type: 'Point',
            coordinates: [lon,lat]
        }
    };
    //we push each point to the dummy variable
    jsonFeatures.push(feature);
  });


  //declare a new feature collection made up of json features
  var geoJson = { type: 'FeatureCollection', features: jsonFeatures };

  //if our load counter is above zero, we will remove the previous layer group (clear the map)
  if (loadCounter > 0) {
    map.eachLayer(function (layer) {
      map.removeLayer(layer)
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 18
    }).addTo(map);
  }
  
  lineGroup.addTo(map);
  //we define a new layer group, which is a geojson of the features, but on each feature we bind a popup that will show the name and the ICAO...
  layerGroup = L.geoJSON(geoJson, {
    onEachFeature: function (feature, layer) {
      layer.bindPopup('<h1>'+feature.properties.name+'</h1><p>ICAO: '+feature.properties.ICAO+'</p>');
      layer.setIcon(airportIcon)
    }
  }).addTo(map);// we add it to the map
  

  //create the origin airport marker
  var originPoint = L.marker([originAirport[0],originAirport[1]], {icon: originAirportIcon}).addTo(map); //add the marker to the map

  //create great circle lines from the origin airport to the destinations
  // var dummyPoint = new L.LatLng(12.5, 17.5)
  // const geodesic = new L.Geodesic([originCoord, dummyPoint]).addTo(map);

  loadCounter += 1;//we increase the counter by one (the map has loaded at least once)
}


// var page_title = 'Palanga_International_Airport'; //CHOOSE THE AIRPORT TO SEARCH FOR
// var t1; //declare the timing variable
// const t0 = performance.now(); //get the time start
// assignCoordinates(page_title); //use the tool

// assignCoordinates(page_title);
// var test_title = 'Charleroi_Airport';
// getICAOCode(test_title);

// //sets a 100ms timeout on all write functions to await fetch response
// setTimeout(function () {
//   registerICAOCode();
// }, 80);

// //writes geodata to variable
// function registerICAOCode() {
//   return ICAOCodeExtract;
// }

// export { registerICAOCode, getICAOCode };
