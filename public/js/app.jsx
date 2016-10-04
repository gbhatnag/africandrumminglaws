// Routing and app
var Router = ReactRouter.Router;
var Route = ReactRouter.Route;
var IndexRoute = ReactRouter.IndexRoute;
var Link = ReactRouter.Link;
var browserHistory = ReactRouter.browserHistory;

var app = firebase.initializeApp({
  apiKey: "AIzaSyBcbMGVPYSdgEi4WZhlxoyyR0-YqwCP0HM",
  authDomain: "africandrumminglaws.firebaseapp.com",
  databaseURL: "https://africandrumminglaws.firebaseio.com",
  storageBucket: "africandrumminglaws.appspot.com",
});

var adlmap = null;

// Create custom event
var FilterChangeEvent = document.createEvent('Event');
FilterChangeEvent.initEvent('filterChange', true, true);

// Forms and "models"
const t = TcombForm;
const Form = t.form.Form;
const SignatorySchema = t.struct({
  name: t.String,
  title: t.String,
  org: t.String
});
const LocationSchema = t.struct({
  lat: t.maybe(t.Number),
  lon: t.maybe(t.Number)
});
const FeeSchema = t.struct({
  s: t.maybe(t.Number),
  d: t.maybe(t.Number),
  k: t.maybe(t.Number),
  N: t.maybe(t.Number)
})
const FeeScheduleSchema = t.struct({
  period_start: t.String,
  period_end: t.String,
  fee: FeeSchema
});
const DrumSchema = t.struct({
  drum_name: t.String,
  drum_id: t.String,
  fee_schedules: t.list(FeeScheduleSchema)
});
const LawSchema = t.struct({
  "id": t.String,
  "citation": t.String,
  "title": t.String,
  "council": t.String,
  "date_of_publication": t.String,
  "date_of_issue": t.String,
  "date_of_effect": t.String,
  "thumbPath": t.String,
  "pdfPath": t.String,
  "countryID": t.String,
  "countryLabel": t.String,
  "adopted_from": t.maybe(t.list(t.String)),
  "amends": t.maybe(t.list(t.String)),
  "revokes": t.maybe(t.list(t.String)),
  "signatories": t.maybe(t.list(SignatorySchema)),
  "location": t.maybe(LocationSchema),
  "drums": t.maybe(t.list(DrumSchema))
});
const LawSchemaOptions = {
  fields: {
    id: {
      disabled: true
    },
    countryID: {
      disabled: true
    },
    countryLabel: {
      disabled: true
    },
    citation: {
      disabled: true
    },
    thumbPath: {
      disabled: true
    },
    pdfPath: {
      disabled: true
    }
  }
};

// helper to clean up citations
// i.e. "W.R.L.N. 13 of 1956" --> "WRLN13of1956"
var sanitizeCitation = function (str) {
  return str.split('.').join('').split(' ').join('');
};

// helper to display pluralized labels
var displayPluralized = function (itemStr, collectionObj) {
  var i = Object.keys(collectionObj).length;
  var singular = i + ' ' + itemStr;
  return i > 1 ? singular + 's' : singular;
};

// Laws
var Laws = React.createClass({
  render: function () {
    return (
      <div className="list-group">
        {this.props.laws.map(this.renderLawItem)}
      </div>
    );
  },

  renderLawItem: function (law, i) {
    return (
      <Link to={"/admin/laws/" + sanitizeCitation(law.citation)}
        key={sanitizeCitation(law.citation)}
        className="list-group-item" activeClassName="active">
        <h4 className="list-group-item-header">
          {law.citation} <small>law #{i+1}</small>
        </h4>
        <p className="list-group-item-text">{law.title}</p>
      </Link>
    );
  }
});

var LawsPg = React.createClass({
  mixins: [ReactFireMixin],

  getInitialState: function () {
    return {
      laws: []
    }
  },

  render: function () {
    return (
      <div>
        <p>We need to add all relevant data to each of the following laws and
          review for accuracy.</p>
        <div id="laws-loader" className="progress progress-striped active">
          <div className="progress-bar" style={{width:'100%'}}></div>
        </div>
        <Laws laws={this.state.laws} />
      </div>
    );
  },

  componentWillMount: function () {
    // bind laws
    var ref = firebase.database().ref("/laws");
    this.bindAsArray(ref, "laws");
  },

  componentDidMount: function () {
    window.setTimeout(function () {
      $("#laws-loader").remove();
    }, 2000);
  }
});

var LawPg = React.createClass({
  mixins: [ReactFireMixin],

  contextTypes: {
    router: React.PropTypes.object.isRequired
  },

  getInitialState: function () {
    return {
      law: null
    }
  },

  render: function () {
    return (
      <div>
        <h1>{this.renderTitle(this.state.law)}</h1>
        {this.renderLawForm(this.state.law)}
      </div>
    );
  },

  save: function (ev) {
    ev.preventDefault();
    firebase.database().ref("/laws/" + this.state.law.id).update(this.refs.editLawForm.getValue());
    this.context.router.push('/admin/laws');
  },

  cancel: function () {
    this.context.router.push('/admin/laws');
  },

  renderTitle: function (law) {
    if (!law) {
      return ("Loading...");
    } else {
      return law.title;
    }
  },

  renderLawForm: function (law) {
    if (!law) {
      return (<p>Loading...</p>);
    } else {
      return (
        <form onSubmit={this.save}>
          <Form ref="editLawForm" type={LawSchema} value={law} options={LawSchemaOptions}/>
          <p>
            <button type="submit" className="btn btn-primary btn-lg">Save</button>
            <button type="button" className="btn btn-default btn-lg" onClick={this.cancel}>Cancel</button>
          </p>
        </form>
      );
    }
  },

  componentWillMount: function () {
    // bind law
    if (this.props.params.lawId) {
      var ref = firebase.database().ref("/laws/" + this.props.params.lawId);
      this.bindAsObject(ref, "law");
    }
  }
});

// Static Pages
var  HomePg = function (props) {
  return (
    <div className="row">
      <div className="col-xs-6">
        <p className="lead">
          The African Drumming Laws project works with newly discovered laws
          to understand how and why the British colonial government controlled
          and criminalized drumming in native African communities.
        </p>
      </div>
      <div className="col-xs-6">
        <div className="panel panel-success">
          <div className="panel-heading">
            <h3 className="panel-title">Data Editing Mode</h3>
          </div>
          <div className="panel-body">
            The African Drumming Laws Explorer is currently being used to
            extract, organize and validate data pulled from our primary
            legal documents. Full map, content, filters, visualizations
            and more are coming soon.
          </div>
        </div>
      </div>
    </div>
  );
};

var AboutPg = function (props) {
  return (
    <div>
      <p>This is the "intro" page with brief description, video, etc.</p>
    </div>
  );
};

var CreditsPg = function (props) {
  return (
    <div>
      <p>List specific people and roles contributed.</p>
    </div>
  );
};

var AdminPg = function (props) {
  return (
    <div>
      <p>Update data for the following:</p>
      <ul>
        <li>
          <Link to="/admin/laws" activeClassName="active">Laws</Link>
        </li>
        <li>
          <Link to="/admin/drums" activeClassName="active">Drums</Link>
        </li>
        <li>
          <Link to="/admin/councils" activeClassName="active">Councils</Link>
        </li>
      </ul>
    </div>
  );
};

var DrumsPg = function (props) {
  return (
    <div>
      <p>Drum data coming soon to a browser near you.</p>
    </div>
  );
};

var CouncilsPg = function (props) {
  return (
    <div>
      <p>List council data here.</p>
    </div>
  );
};

// Map components
var MapPopup = function (council) {
  var drumtext = 'drum';
  if (council.numdrums == 0) {
    council.numdrums = 8;
    drumtext += 's';
  } else if (council.numdrums > 1) {
    drumtext += 's';
  }
  var lawtext = 'law';
  if (council.numlaws > 1) {
    lawtext += 's';
  }
  return (
    <div className="map-popup">
      <h6>{council.fullname}</h6>
      <h5><strong>{council.numdrums} {drumtext}</strong> controlled</h5>
      <h5><strong>{council.numlaws} {lawtext}</strong> published</h5>
    </div>
  );
};

var LawItem = React.createClass({
  render: function () {
    return (
      <a href="#" className="list-group-item">
        <h4 className="list-group-item-heading">Law Item</h4>
        <p className="list-group-item-text">Something else about dunduns</p>
      </a>
    );
  }
});

var CouncilItem = React.createClass({
  render: function () {
    return (
      <a href="#" className="list-group-item">
        <h4 className="list-group-item-heading">Council Item</h4>
        <p className="list-group-item-text">Something else about dunduns</p>
      </a>
    );
  }
});

var DrumItem = React.createClass({
  lawmodal: {},  // static DOM elements

  getInitialState: function () {
    return {
      drum: {},
      laws: []
    };
  },

  openLaw: function (law) {
    var lawPath = "https://africandrumminglaws.org" + law.pdfPath;
    this.lawmodal.title.html(law.citation);
    this.lawmodal.viewer.attr('src', lawPath);
    this.lawmodal.body.append(this.lawmodal.viewer);
    this.lawmodal.download.attr('href', lawPath);
    this.lawmodal.modal.modal('show');
  },

  renderLawRow: function (law) {
    var toTitleCase = function (str) {
      return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    };
    return (
      <a href="#" className="list-group-item" key={law.id} data-toggle="modal"
        data-target="#law-modal" onClick={this.openLaw.bind(this, law)}>
        <h4 className="list-group-item-heading">{toTitleCase(law.council)}</h4>
        <p className="list-group-item-text">{law.citation}</p>
      </a>
    );
  },

  render: function () {
    var drum = this.state.drum;
    if (!$.isEmptyObject(drum)) {
      var laws = this.state.laws;
      var img = drum.picture == "consult spreadsheet" ? '/img/drums/unknown.jpg' : drum.picture;
      var name = Object.keys(drum.names)[0];
      return (
        <div className="drum-item-header">
          <div className="row">
            <div className="col-xs-12">
              <img className="img-responsive" src={img} />
              <h2 className="center">{name}</h2>
              <p>
                Controlled by&nbsp;
                <strong>{displayPluralized('law', drum.law_mentions)}</strong> in&nbsp;
                <strong>{displayPluralized('council', drum.council_mentions)}</strong>:
              </p>
            </div>
          </div>
          <div className="list-group">
            {this.state.laws.map(this.renderLawRow)}
          </div>
        </div>
      );
    } else {
      return (
        <p className="text-meta">Loading...</p>
      );
    }
  },

  componentWillMount: function () {
    var self = this;
    $.getJSON(app.options.databaseURL + "/.json", function (data) {
      var drum = data.drums[self.props.params.drumId];
      var citations = Object.keys(drum.law_mentions);
      var laws = [];
      citations.forEach(function (citation) {
        laws.push(data.laws[citation]);
      });
      self.setState({
        drum: drum,
        laws: laws.sort(function (a,b) {
          if (a.council.trim().toLowerCase() < b.council.trim().toLowerCase()) return -1;
          if (a.council.trim().toLowerCase() > b.council.trim().toLowerCase()) return 1;
          return 0;
        })
      });
    });
  },

  componentDidMount: function () {
    var $lawmodal   = $("#law-modal");
    var lawtitle    = $(".modal-title", $lawmodal);
    var lawviewer   = $('<iframe id="law-viewer" src="" frameborder="0"></iframe>');
    var lawdownload = $("#law-download", $lawmodal);
    var lawbody     = $(".modal-body", $lawmodal);
    var lawmodal = {
      modal: $lawmodal,
      title: lawtitle,
      body: lawbody,
      viewer: lawviewer,
      download: lawdownload
    };
    this.lawmodal = lawmodal;
    $lawmodal.on('hidden.bs.modal', function (ev) {
      lawbody.empty();
    });
  }
});

var DrumList = React.createClass({
  getInitialState: function () {
    return {
      drums: [],   // full set of drums
      filters: {
        yearindex: {},
        numdrums: '-'
      }
    };
  },

  renderDrumItem: function (drum) {
    var drumLocation = {
      pathname: "/drums/" + drum.id
    };
    var thumb = drum.thumb ? drum.thumb : "/img/drums/unknown-th.jpg";
    return (
      <Link to={drumLocation} className={drum.yearsorted.join(' ') + ' drum-item list-group-item clearfix'} key={drum.id}>
        <div className="row">
          <div className="col-xs-4">
            <img src={thumb} className="drum-thumb" />
          </div>
          <div className="col-xs-8">
            <h4 className="list-group-item-heading">{Object.keys(drum.names)[0]}</h4>
            <p className="list-group-item-text">
              <strong>{displayPluralized('law', drum.law_mentions)}</strong> in&nbsp;
              <strong>{displayPluralized('council', drum.council_mentions)}</strong>
            </p>
            <p className="list-group-item-text small year-list">{drum.yearsorted.join(' ')}</p>
            <p className="list-group-item-text small year-list-shadow">{drum.yearsorted.join(' ')}</p>
          </div>
        </div>
      </Link>
    );
  },

  render: function () {
    return (
      <div>
        <div className="row">
          <div className="col-xs-12">
            <div id="filter-btn" className="btn btn-default btn-block text-info clearfix">
              <span className="pull-left"><span className="icon-filter"></span> Filter &amp; Sort</span>
              <span className="pull-right"><span className="badge"><strong>{this.state.filters.numdrums}</strong></span> drums</span>
            </div>
          </div>
        </div>
        <div id="filters" className="row">
          <div className="col-xs-4 filter-labels">
            <p className="text-right">Show:</p>
            <p className="text-right sortbylabel">Sort by:</p>
          </div>
          <div className="col-xs-8 filter-values">
            <p>
              <select id="filter-year">
                <option value="all">All Years</option>
                <option value="1956">1956</option>
                <option value="1958">1958</option>
                <option value="1959">1959</option>
                <option value="1960">1960</option>
                <option value="1961">1961</option>
                <option value="1962">1962</option>
                <option value="1963">1963</option>
                <option value="1964">1964</option>
                <option value="1965">1965</option>
                <option value="1967">1967</option>
                <option value="1968">1968</option>
                <option value="1971">1971</option>
                <option value="1975">1975</option>
              </select>
            </p>
            <p>
              <select id="sortby">
                <option value="mentions">Most mentioned</option>
                <option value="alpha">Name: A-Z</option>
              </select>
            </p>
          </div>
        </div>
        <div className="list-group">
          {this.state.drums.map(this.renderDrumItem)}
          <footer>
            <p className="small"><a className="noline" rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">
              <img alt="Creative Commons License"
                src="https://i.creativecommons.org/l/by-sa/4.0/80x15.png" />
            </a>&nbsp;<Link to="/">African Drumming Laws</Link>
            <br/>by <a href="http://revolutionari.es">The Revolutionaries</a>
              &nbsp;is licensed under a <a rel="license"
                href="http://creativecommons.org/licenses/by-sa/4.0/">Creative
                Commons Attribution-ShareAlike 4.0 International License</a>.
            </p>
          </footer>
        </div>
      </div>
    );
  },

  componentWillMount: function () {
    var self = this;
    $.getJSON(app.options.databaseURL + "/drums.json", function (data) {
      var drums = $.map(data, function (drum) {
        var extended = drum;
        var years = {};
        var citations = Object.keys(extended.law_mentions);
        citations.forEach(function (citation) {
          var yr = citation.split('of')[1];
          if (years[yr]) {
            years[yr]++;
          } else {
            years[yr] = 1;
          }
        });
        extended.yearfrequency = years;
        extended.yearsorted = Object.keys(years).sort();
        return extended;
      });
      drums.sort(function (a,b) {
        return Object.keys(b.law_mentions).length - Object.keys(a.law_mentions).length;
      });
      self.setState({
        drums: drums,
        filters: {
          numdrums: drums.length
        }
      });
    });
  },

  componentDidMount: function () {
    var self = this;
    var filterbtn  = $("#filter-btn");
    var filters    = $("#filters");
    var filteryear = $("#filter-year");
    var sortby     = $("#sortby");

    var highlightText = function (src_str, term) {
      term = term.replace(/(\s+)/,"(<[^>]+>)*$1(<[^>]+>)*");
      var pattern = new RegExp("("+term+")", "gi");

      src_str = src_str.replace(pattern, "<mark>$1</mark>");
      src_str = src_str.replace(/(<mark>[^<>]*)((<[^>]+>)+)([^<>]*<\/mark>)/,"$1</mark>$2<mark>$4");
      return src_str;
    };

    // convert to chosen and setup event handlers
    console.log('chosen');
    filteryear.chosen({
      width:'180px',
      search_contains: true
    }).change(function (ev) {
      var yr = ev.target.value;
      var $selected = $(".drum-item");
      if (yr == "all") {
        $selected.slideDown();
      } else {
        $selected = $(".drum-item." + yr);
        $selected.slideDown();
        $(".drum-item:not(." + yr + ")").slideUp();
      }
      $selected.each(function () {
        var $source = $('p.year-list-shadow', this);
        var $target = $('p.year-list', this);
        var highlighted = highlightText($source.html(), yr.toString());
        $target.html(highlighted);
      });
      self.setState({
        filters: {
          numdrums: $selected.length
        }
      });

      // what happens on the map??
    });
    sortby.chosen({
      width:'180px',
      disable_search: true
    }).change(function (ev) {
      console.log('sort change');
      console.log(ev.target.value);
    });

    filterbtn.click(function (ev) {
      filters.slideToggle();
    });
  }
});

// Layout components
var MapLayout = React.createClass({
  getInitialState: function () {
    return {
      geo: {}
    }
  },

  render: function () {
    return (
      <div className="row">
        <div id="sidebar" className="col-xs-4">
          {this.props.children}
        </div>
        <div id="map" className="col-xs-8"></div>
      </div>
    );
  },

  componentDidUpdate: function () {
    if (adlmap) {
      return;
    }
    console.log("draw map");
    var self = this;
    mapboxgl.accessToken = 'pk.eyJ1IjoiZ2JoYXRuYWciLCJhIjoiY2lxbDMzeDdnMDAxcGVpa3ZqOWFtNTNpZyJ9.6zSnoYwnb85A8DS107TSnA';
    var map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/gbhatnag/ciql39wck0035bgm2dfj108tt',
      minZoom: 5.85,
      maxZoom: 10.5,
      center: [4.534582795867038, 7.105981715944324],
      zoom: 6.85
    });
    map.addControl(new mapboxgl.Navigation());
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
    adlmap = map;

    var logPosition = function () {
      console.log("center: " + map.getCenter());
      console.log("zoom: " + map.getZoom());
    };

    map.on("load", function (ev) {
      map.addSource('wnprovinces', {
        type: 'geojson',
        data: self.state.geo.wnprovinces
      });
      map.addLayer({
        id: 'wnprovinces',
        type: 'line',
        source: 'wnprovinces',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': 'rgba(214,214,214,1)',
          'line-width': 2
        }
      });

      map.addSource('wnborder', {
        type: 'geojson',
        data: self.state.geo.wnborder
      });
      map.addLayer({
        id: 'wnborder',
        type: 'line',
        source: 'wnborder',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': 'rgba(195,96,96,0.5)',
          'line-width': 2
        }
      });

      map.addSource('wnlabel', {
        type: 'geojson',
        data: {
          type: "Feature",
          properties: {
            label: "WESTERN NIGERIA"
          },
          geometry: {
            type: "Point",
            coordinates: [5.009996473488599, 6.623436730545936]
          }
        }
      });
      map.addLayer({
        id: 'wnlabel',
        type: 'symbol',
        source: 'wnlabel',
        layout: {
          "text-field": "{label}",
          "text-font": ["Mark Offc Pro Bold"],
          "text-size": 18,
          "text-transform": "uppercase",
          "text-letter-spacing": 0.3,
          "text-offset": [1,1],
          "text-anchor": "bottom"
        },
        paint: {
          'text-color': 'rgba(195,96,96,0.5)'
        }
      });

      map.addSource('wnprovincelabels', {
        type: 'geojson',
        data: self.state.geo.wnprovincelabels
      });
      map.addLayer({
        id: 'wnprovincelabels',
        type: 'symbol',
        source: 'wnprovincelabels',
        layout: {
          "text-field": "{label}",
          "text-font": ["Open Sans Bold"],
          "text-size": 14,
          "text-transform": "uppercase",
          "text-letter-spacing": 0.1,
          "text-offset": [1,1],
          "text-anchor": "bottom"
        },
        paint: {
          'text-color': 'rgba(207,207,207,1)'
        }
      });

      map.addSource('councils', {
        type: 'geojson',
        data: self.state.geo.councils
      });
      map.addLayer({
        id: 'councils',
        type: 'symbol',
        source: 'councils',
        layout: {
          'icon-image': 'circle-11',
          'icon-allow-overlap': true,
          'text-optional': true,
          'text-field': '{shortname}',
          "text-font": ["HolmenOT Regular"],
          "text-size": 12,
          "text-transform": "uppercase",
          "text-letter-spacing": 0.05,
          "text-offset": [0, 1.8],
          "text-anchor": "bottom"
        },
        paint: {
          'icon-color': "#943b2b",
          'text-color': "#943b2b",
          'icon-opacity': 0.7
        }
      });
      var popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
      });
      map.on('mousemove', function (ev) {
        var features = map.queryRenderedFeatures(ev.point, { layers: ['councils'] });
        map.getCanvas().style.cursor = (features.length) ? 'pointer' : '';
        if (!features.length) {
            popup.remove();
            return;
        }
        var feature = features[0];
        var popupDiv = document.createElement('div');
        ReactDOM.render(MapPopup(feature.properties), popupDiv);
        popup.setLngLat(feature.geometry.coordinates)
          .setHTML(popupDiv.innerHTML)
          .addTo(map);
      });

      // track map movements and events
      // $(window).resize(logPosition);
      // map.on("move", logPosition);
      // map.on("zoom", logPosition);
      map.on("click", function (data) {
        logPosition();
        console.log("clicked at: " + data.lngLat);
      });

      // // Listen for filter change
      // document.addEventListener('filterChange', function (ev) {
      //   console.log(ev.target);
      //   console.log(ev.target.id);
      //   console.log(ev.target.checked);
      //   var layerGroup = ev.target.id;
      //   self.state.baseLayers[layerGroup].forEach(function (layerId) {
      //     console.log("changing layer: " + layerId);
      //     map.setLayoutProperty(layerId, 'visibility',
      //       ev.target.checked ? 'visible' : 'none');
      //   });
      // }, false);
    });
  },

  componentWillMount: function () {
    var self = this;
    $.getJSON(app.options.databaseURL + "/geo.json", function (data) {
      self.setState({
        geo: data
      });
    });
  }
});

var Navi = React.createClass({
  handleModal: function (ev) {
    var content = ev.target.id.split('-')[1];
    $('.modal').modal('hide');
    $('#' + content + '-modal').modal('show');
    $('.nav-modal').removeClass("active");
    $('#' + ev.target.id).addClass("active");
  },

  render: function () {
    return (
      <nav className="navbar navbar-default navbar-fixed-top">
        <div className="container-fluid">
          <div className="navbar-header">
            <button type="button" className="navbar-toggle collapsed" data-toggle="collapse" data-target="#adl-nav" aria-expanded="false">
              <span className="sr-only">Toggle navigation</span>
              <span className="icon-bar"></span>
              <span className="icon-bar"></span>
              <span className="icon-bar"></span>
            </button>
            <Link to="/" className="navbar-brand">African Drumming Laws</Link>
          </div>

          <div className="collapse navbar-collapse" id="adl-nav">
            <ul className="nav navbar-nav">
              <li>
                <a href="#about" id="nav-about" onClick={this.handleModal} className="nav-modal">About</a>
              </li>
              <li>
                <a href="#other" id="nav-other" onClick={this.handleModal} className="nav-modal">Other Countries</a>
              </li>
              <li>
                <a href="#research" id="nav-research" onClick={this.handleModal} className="nav-modal">Research</a>
              </li>
              <li>
                <a href="#credits" id="nav-credits" onClick={this.handleModal} className="nav-modal">Credits</a>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    );
  },

  componentDidMount: function () {
    $('.modal').on('hidden.bs.modal', function (ev) {
      $('.nav-modal').removeClass("active");
    });
  }
});

var MainLayout = React.createClass({
  render: function () {
    return (
      <div>
        <Navi />
        <main className="container-fluid">
          {this.props.children}
        </main>
      </div>
    );
  }
});

ReactDOM.render((
  <Router history={browserHistory}>
    <Route component={MainLayout}>
      <Route path="/" component={MapLayout}>
        <IndexRoute component={DrumList} />
        <Route path="/drums" component={DrumList} />
        <Route path="/drums/:drumId" component={DrumItem} />
        <Route path="/laws/:lawId" component={LawItem} />
        <Route path="/councils/:councilId" component={CouncilItem} />
      </Route>
      <Route path="/admin" component={AdminPg} />
      <Route path="/admin/drums" component={DrumsPg} />
      <Route path="/admin/councils" component={DrumsPg} />
      <Route path="/admin/laws" component={LawsPg} />
      <Route path="/admin/laws/:lawId" component={LawPg} />
    </Route>
  </Router>
), document.getElementById('root'));
