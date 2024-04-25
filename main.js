const fs = require('fs');

const creationModal = document.getElementById('creationModal');
const markerTitleInput = document.getElementById('markerTitle');
const markerDescriptionInput = document.getElementById('markerDescription');
const markerTitleEditInput = document.getElementById('markerTitleEdit');
const markerDescriptionEditInput = document.getElementById('markerDescriptionEdit');
const { shell } = require('electron');


var latestLat = 0;
var latestLng = 0;

var moveMarkerMode = false;
var markerBeingMoved;
var markerBeingEdited;

let zoomControl = true;
let lightMode = true;

function jsonReader(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

var path = require('path');

if (!fs.existsSync(path.join(__dirname, 'markers.json'))) { // check if markers.json DOESN'T exists
    fs.writeFileSync(path.join(__dirname, 'markers.json'), '[]');
}

if (!fs.existsSync(path.join(__dirname, 'config.json'))) {
    fs.writeFileSync(path.join(__dirname, 'config.json'), '[\n{\n"iconsWidth": 26,\n"iconsHeight":23\n}\n]');
}

const jsonFilename = path.join(__dirname, 'markers.json');
const configFilename = path.join(__dirname, 'config.json');

let markersData = jsonReader(jsonFilename);
let configData = jsonReader(configFilename);
let iconsWidth = configData[0].iconsWidth;
let iconsHeight = configData[0].iconsHeight;


const mapFilename = path.join(__dirname, 'map.jpg');
const imagesDir = path.join(__dirname, 'images/');
const markersDir = path.join(__dirname, 'images/markers/');

// Support old saves
markersData.forEach(function (marker, index, array) {
    switch (markersData[index].icon) {
        case "arrowIcon":
            markersData[index].icon = "icon_2pointer";
            break;
        case "anvilIcon":
            markersData[index].icon = "icon_anvil";
            break;
        case "bigCityIcon":
            markersData[index].icon = "icon_castle2";
            break;
        case "caveIcon":
            markersData[index].icon = "icon_cave3";
            break;
        case "cave2Icon":
            markersData[index].icon = "icon_cave2";
            break;
        case "townIcon":
            markersData[index].icon = "icon_house";
            break;
        case "dockIcon":
            markersData[index].icon = "icon_dockhouse2";
            break;
        case "dockHouseIcon":
            markersData[index].icon = "icon_dockhouse";
            break;
        case "gateIcon":
            markersData[index].icon = "icon_castlegate";
            break;
        case "mediumCastleIcon":
            markersData[index].icon = "icon_castle";
            break;
        case "mineIcon":
            markersData[index].icon = "icon_tools";
            break;
        case "smallTentIcon":
            markersData[index].icon = "icon_tent";
            break;
        case "skullIcon":
            markersData[index].icon = "icon_skull";
            break;
        case "whiteSkullIcon":
            markersData[index].icon = "icon_skull2";
            break;
    }
});

let markersPaths = [];

// // DZI system
// var map = L.map('mapid', { 
//         attributionControl: false,
//         minZoom: 5
//     }).setView(new L.LatLng(0, 0), 0);

// var dzLayer = L.tileLayer.deepzoom('dzi/map_files/', {
//     width: 8192,
//     height: 7992
// }).addTo(map);

// map.fitBounds(dzLayer.options.bounds);

const sizeOf = require('image-size');
const { callbackify } = require('util');
const { config } = require('process');
const mapDimensions = sizeOf(mapFilename);

var map = L.map('mapid', {
    minZoom: 8,
    maxZoom: 20,
    zoom: 15,
    attributionControl: false,
    zoomControl: true,
    center: [0, 0]
    // crs: L.CRS.EPSG3857
});

var w = mapDimensions.width,
    h = mapDimensions.height,
    url = mapFilename;

var southWest = map.unproject([0, h], map.getMaxZoom() - 1);
var northEast = map.unproject([w, 0], map.getMaxZoom() - 1);
var bounds = new L.LatLngBounds(southWest, northEast);

L.imageOverlay(url, bounds).addTo(map);

map.setMaxBounds(bounds);

var markerGroup = L.layerGroup().addTo(map);


function onMapClick(cPos) {

    if (!moveMarkerMode) { // We're not moving a marker, so we're creating one
        latestLat = cPos.latlng.lat;
        latestLng = cPos.latlng.lng;

        creationModal.style.visibility = "visible";
        markerTitleInput.focus();

    } else { // we're moving a marker!
        markersData.forEach(function (marker, index, array) {
            if (marker.id === markerBeingMoved) {
                // console.log(marker.id);
                // console.log(cPos.latlng.lat +", "+cPos.latlng.lng);
                // console.log(markersData);
                var markerIndex = markersData.findIndex(e => e.id === marker.id);
                markersData[markerIndex].lat = cPos.latlng.lat;
                markersData[markerIndex].lng = cPos.latlng.lng;
                moveMarkerMode = false;
                markerBeingMoved = null;
                document.getElementById("mapid").style.cursor = 'crosshair';
                updateJsonFile();
            }
        })
    }
}
map.on('click', onMapClick);

var defaultIcon = L.icon({
    iconUrl: 'images/marker-icon.png',
    shadowUrl: 'images/marker-shadow.png',
    iconSize: [25, 41], // size of the icon
    shadowSize: [41, 41], // size of the shadow
    iconAnchor: [13, 30], // point of the icon which will correspond to marker's location
    shadowAnchor: [13, 27],  // the same for the shadow
    popupAnchor: [0, -25] // point from which the popup should open relative to the iconAnchor
});

var hexaIcon = L.Icon.extend({
    options: {
        shadowUrl: 'images/icon-shadow.png',
        iconSize: [iconsWidth, iconsHeight], // size of the icon
        shadowSize: [iconsWidth, iconsHeight], // size of the shadow
        iconAnchor: [iconsWidth / 2, iconsHeight * 1.2], // point of the icon which will correspond to marker's location
        shadowAnchor: [iconsWidth / 2, iconsHeight * 1.1],  // the same for the shadow
        popupAnchor: [0, -iconsHeight * 1.1] // point from which the popup should open relative to the iconAnchor
    }
});

fs.readdir(markersDir, (err, files) => {
    if (err) {
        return console.log("Unable to scan directory: " + err);
    }

    // list every one of the images' filenames one by one
    files.forEach(function (file, index, array) {
        // console.log(files.length); // amount of images in markersDir
        // console.log(file); // returns icon_name.png
        // console.log(path.parse(file).name); // returns icon_name
        // console.log(path.parse(file).ext); // returns .png
        // console.log(path.parse(file).base); // returns icon_name.png
        markersPaths[index] = path.parse(file).name;
        window[markersPaths[index]] = new hexaIcon({ iconUrl: path.join(markersDir, file) });
        document.getElementById('iconsCreate').insertAdjacentHTML('beforeend', '<a class="iconCreationBtn iconCreationBtnX" data-icon-string="' + path.parse(file).name + '" onClick="createMarker(\'' + path.parse(file).name + '\')"><img src="' + markersDir + path.parse(file).base + '" title="' + path.parse(file).name + '" /></a>');
        document.getElementById('iconsEdit').insertAdjacentHTML('beforeend', '<a class="iconEditBtn iconEditBtnX" data-icon-string="' + path.parse(file).name + '" onClick="editMarker(\'' + path.parse(file).name + '\')"><img src="' + markersDir + path.parse(file).base + '" /></a>');
    });
    renderMarkers();
});

// Render icons
function renderMarkers() {
    markerGroup.clearLayers();
    var markers = [];
    for (var i = 0; i < markersData.length; ++i) {
        var editBtn = '<button type="button" onclick="editMarkerBtn(\'' + markersData[i].id + '\');" class="editMarkerBtn">edit</button>';
        var moveBtn = '<button type="button" onclick="moveMarker(\'' + markersData[i].id + '\');" class="moveMarkerBtn">move</button>';
        var delBtn = '<button type="button" onclick="removeMarker(\'' + markersData[i].id + '\');" class="deleteMarkerBtn">delete</button>';
        markers[i] = L.marker([markersData[i].lat, markersData[i].lng], { icon: eval(markersData[i].icon), draggable: false }).on('click', markerClicked).addTo(markerGroup);
        markers[i].bindPopup("<h2>" + markersData[i].title + "</h2><br />" + markersData[i].description + '<br /><br />' + '<div id="popupCtrl">' + editBtn + moveBtn + delBtn + '</div>');
        markers[i].on('mouseover', function (e) {
            this.openPopup();
        });
        // markers[i].on('mouseout', function(e){
        //     this.closePopup();
        // });
    }
}

// Marker is clicked
function markerClicked(e) {
    // console.log("Marker clicked: " + e.latlng);
}

// Edit button clicked
function editMarkerBtn(markerID) {
    markersData.forEach(function (item, index, array) {
        if (item.id === markerID) {
            document.getElementById("editModalSelectedTitle").innerHTML = item.title;
            document.getElementById("markerTitleEdit").value = item.title;
            document.getElementById("markerDescriptionEdit").value = item.description;
            markerBeingEdited = markerID;
        }
    });
    document.getElementById("editModal").style.visibility = "visible";
}

// Edit a marker (after an icon has been selected)
function editMarker(clickedIcon) {
    editModal.style.visibility = "hidden";

    if (clickedIcon == "cancel") {
        return;
    } else {
        markersData.forEach(function (marker, index, array) {
            if (marker.id === markerBeingEdited) {
                var markerIndex = markersData.findIndex(e => e.id === marker.id);
                markersData[markerIndex].title = markerTitleEditInput.value;
                markersData[markerIndex].description = markerDescriptionEditInput.value;
                markersData[markerIndex].icon = clickedIcon;
                markerBeingEdited = null;
                updateJsonFile();
            }
        });
    }
}

// Move marker
function moveMarker(markerID) {
    moveMarkerMode = true;
    map.closePopup();
    document.getElementById("mapid").style.cursor = "url('images/reposition-icon.png') 16 16, auto";
    markerBeingMoved = markerID;
}

// Delete marker
function removeMarker(markerID) {
    let newMarkersData = markersData.filter(({ id }) => id != markerID); // remove the marker and put remaining ones in a new array
    markersData = newMarkersData;

    markerTitleInput.value = "";
    markerDescriptionInput.value = "";

    updateJsonFile();
}

// Main Navigation
const menuBtns = document.querySelectorAll('.menuBtn');
for (const btn of menuBtns) {
    btn.addEventListener('click', (e) => {

        const menuBtn = btn.dataset.menuBtn;

        switch (menuBtn) {
            case 'discord':
                shell.openExternal("https://discord.gg/cpz8pRBZ9W");
                break;
            case 'close':
                document.getElementById('mainNav').style.visibility = 'hidden';
                break;
            default:
                alert("Error!");
        }

    });
}

// Icon Creation Modal
function createMarker(clickedIcon) {

    // clickedIcon returns icon_name
    creationModal.style.visibility = "hidden";

    if (clickedIcon == 'cancel') {
        return;
    }

    var newMarker = {
        "id": genID(),
        "title": markerTitleInput.value,
        "description": markerDescriptionInput.value,
        "icon": clickedIcon,
        "lat": latestLat,
        "lng": latestLng
    }

    markersData.push(newMarker);
    markerTitleInput.value = "";
    markerDescriptionInput.value = "";

    updateJsonFile();
}

// const iconsSelections = document.querySelectorAll('.iconCreationBtn');
// for (const icon of iconsSelections) {
//     icon.addEventListener('click', (e) => { // When an icon is clicked
//         const iconString = icon.dataset.iconString;
//         creationModal.style.visibility = "hidden";

//         if (iconString == "cancel") {
//             return;
//         }

//         var newMarker = {
//             "id": genID(),
//             "title": markerTitleInput.value,
//             "description": markerDescriptionInput.value,
//             "icon": iconString,
//             "lat": latestLat,
//             "lng": latestLng
//         }

//         markersData.push(newMarker); // add the new marker to markersData
//         fs.writeFile(jsonFilename, JSON.stringify(markersData, null, 4), err => {
//             if (err) {
//                 console.log(err);
//             }
//         });

//         markerTitleInput.value = "";
//         markerDescriptionInput.value = "";

//         renderMarkers();
//     });
// }

// Icon Edit Modal
// const iconEditBtns = document.querySelectorAll('.iconEditBtn');
// for (const btn of iconEditBtns) {
//     btn.addEventListener('click', (e) => {
//         const iconString = btn.dataset.iconString;
//         editModal.style.visibility = "hidden";

//         if (iconString == "cancel") {
//             return;
//         } else {
//             markersData.forEach(function (marker, index, array) {
//                 if (marker.id === markerBeingEdited) {
//                     var markerIndex = markersData.findIndex(e => e.id === marker.id);
//                     markersData[markerIndex].title = markerTitleEditInput.value;
//                     markersData[markerIndex].description = markerDescriptionEditInput.value;
//                     markersData[markerIndex].icon = iconString;
//                     markerBeingEdited = null;
//                     fs.writeFile(jsonFilename, JSON.stringify(markersData, null, 4), err => {
//                         if (err) {
//                             console.log(err);
//                         }
//                     });
//                     renderMarkers();
//                 }
//             });
//         }
//     });
// }

// renderMarkers();


// Random ID generator
function genID() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

function updateJsonFile() {
    fs.writeFile(jsonFilename, JSON.stringify(markersData, null, 4), err => {
        if (err) {
            console.log(err);
        }
    });
    renderMarkers();
}

function filterCreateIcons() {
    let searchBar = document.getElementById("createSearchBar").value;
    searchBar = searchBar.toLowerCase();
    let x = document.getElementsByClassName('iconCreationBtnX');

    for (i = 0; i < x.length; i++) {
        let fullPath = path.parse(x[i].getElementsByTagName('IMG')[0].src).name;

        if (fullPath.includes(searchBar)) {
            x[i].style.display = "inline-block";
        } else {
            x[i].style.display = "none";
        }
    }
}

function filterEditIcons() {
    let searchBar = document.getElementById("editSearchBar").value;
    searchBar = searchBar.toLowerCase();
    let x = document.getElementsByClassName('iconEditBtnX');

    for (i = 0; i < x.length; i++) {
        let fullPath = path.parse(x[i].getElementsByTagName('IMG')[0].src).name;

        if (fullPath.includes(searchBar)) {
            x[i].style.display = "inline-block";
        } else {
            x[i].style.display = "none";
        }
    }
}

function openAttribution() {
    shell.openExternal("https://cartographyassets.com/assets/10868/interactive-mapper/");
}

function toggleZoomControl() {
    if (zoomControl) {
        map.removeControl(map.zoomControl);
        zoomControl = false;
    } else {
        map.addControl(map.zoomControl);
        zoomControl = true;
    }
}

function toggleLightMode() {
    if (lightMode) {
        document.getElementsByClassName('leaflet-container')[0].style.backgroundColor = "#302c2c";
        lightMode = false;
    } else {
        document.getElementsByClassName('leaflet-container')[0].style.backgroundColor = "#ddd";
        lightMode = true;
    }
}

// Map background
if (fs.existsSync(path.join(__dirname, 'background.jpg'))) { // there's a background.jpg
    let backgroundFilename = path.join(__dirname, 'background.jpg');
    document.getElementById('mapid').style.backgroundImage = "url('" + backgroundFilename.split("\\").join("\\\\") + "')";
} else if (fs.existsSync(path.join(__dirname, 'background.png'))) { // there's a background.png
    let backgroundFilename = path.join(__dirname, 'background.png');
    document.getElementById('mapid').style.backgroundImage = "url('" + backgroundFilename.split("\\").join("\\\\") + "')";
}