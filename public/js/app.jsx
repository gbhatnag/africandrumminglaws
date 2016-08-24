// Routing and app
var Router = ReactRouter.Router;
var Route = ReactRouter.Route;
var Link = ReactRouter.Link;
var browserHistory = ReactRouter.browserHistory;

var app = firebase.initializeApp({
  apiKey: "AIzaSyBcbMGVPYSdgEi4WZhlxoyyR0-YqwCP0HM",
  authDomain: "africandrumminglaws.firebaseapp.com",
  databaseURL: "https://africandrumminglaws.firebaseio.com",
  storageBucket: "africandrumminglaws.appspot.com",
});

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

// helper function to clean up citations
// i.e. "W.R.L.N. 13 of 1956" --> "WRLN13of1956"
var sanitizeCitation = function (str) {
  return str.split('.').join('').split(' ').join('');
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

var ResearchPg = function (props) {
  return (
    <div>
      <h2>Bibliography - Drumming Laws in Western Nigeria</h2>
      <p>The following list of resources pertains to research on colonial era drumming laws in Western Nigeria. These materials provide access to the approximately 100 drumming regulations passed by local governments throughout Western Nigeria from 1956 through 1975. Moreover, this comprehensive bibliography covers areas such as colonial law, customary law, ethnomusicology, anthropology, history, local government and administration, and geography.</p>

      <h3>Colonial Law</h3>
      <h4>Primary</h4>
      <p><span className="c2">Annual Volume of the Laws of Western State
      of Nigeria</span> <span>(Govt. Printer, 1967-1976).</span></p>
      <p><span className="c2">Legislation of the Western Region of
      Nigeria</span> <span>(Govt. Printer, 1952-1964).</span></p>

      <h4>Secondary</h4>
      <p><span className="c2">The Interaction of English Law with
      Customary Law in Western Nigeria: I &amp; II</span><span>, Journal of
      African Law, vol. 4, pp. 40-50, 98-114 (Ayaji, 1960).</span></p>
      <p><span className="c2">The Interaction of English Law with
      Customary Law in West Africa</span><span>, International &amp; Comparative
      Law Quarterly, vol. 13, pp. 574-616 (Daniels, 1964).</span></p>
      <p><span className="c2">Law Libraries in the Western Region/State of
      Nigeria</span><span>, International Library Review, vol. 20(2), pp. 227-32
      (Okewusi, 1988).</span></p>
      <p><span className="c2">Legal Development in Nigeria, 1957-1967: A
      Practicing Lawyer&rsquo;s View</span><span>, Journal of African Law, vol.
      11(2), pp. 77-85 (Williams, 1967).</span></p>

      <h3>Customary Law</h3>
      <p><span className="c2">Customary Law in the New African
      States</span><span>, Univ. Chicago Committee for Comp. Study of New
      Nations, Reprint Series, No. 4 (Fallers, 1965).</span></p>
      <p><span className="c2">Judicial Administration in a Changing
      Society - Customary Courts in Western Nigeria</span><span>, Law and
      Politics in Africa, Asia and Latin America, vol. 8(3/4), pp. 435-46
      (Kayode, 1975).</span></p>
      <p><span className="c2">The Laws and Customs of the Yoruba
      People</span><span>&nbsp;(Ajisafe, 2003).</span></p>
      <p><span className="c2">Native Courts and Native Customary Law in
      Africa</span><span>, Judicial Advisers&rsquo; Conference, Special
      Supplement to Journal of African Administration (Great Britain Colonial
      Office, 1953).</span></p>
      <p><span className="c2">The Nature of African Customary
      Law</span><span>&nbsp;(Elias, 1956).</span></p>
      <p><span className="c2">Restatement of Customary Law in
      Nigeria</span><span>, Nigerian Institute of Advanced Legal Studies (Azinge,
      2013).</span></p>
      <p><span className="c2">A Survey of African Law and Custom with
      Particular Reference to the Yoruba Speaking Peoples of South-Western
      Nigeria</span><span>&nbsp;(Oyewo &amp; Olaoba, 1999).</span></p>
      <p><span className="c2">The Yoruba-Speaking Peoples of the Slave
      Coast of West Africa</span><span>, ch. 11 on Laws and Customs (Ellis,
      1974).</span></p>

      <h3>Ethnomusicology</h3>
      <p><span className="c2">A Descriptive Catalogue of Yoruba Musical
      Instruments</span><span>, Catholic University of America, Studies in Music
      No. 37, Ph.D. Dissertation (Thieme, 1969).</span></p>
      <p><span className="c2">The Drum and Its Role in Yoruba
      Religion</span><span>, Ademola Journal of Religion in Africa, vol. 18(1),
      pp. 15-26 (Adegbite, 1988).</span></p>
      <p><span className="c2">Ogboni Drums</span><span>, African Arts,
      vol. 6(3), pp. 50-52, 84 (Ojo, 1973).</span></p>
      <p><span className="c2">The Talking Drums of Nigeria</span><span>,
      International Library of African Music, vol. 5(4), pp. 36-40 (Akpabot,
      1975/1976).</span></p>
      <p><span className="c2">Yoruban Drums</span><span>, Journal of
      Yoruba and Related Studies, vol. 7, pp. 5-14</span></p>

      <h3>Anthropology</h3>
      <p><span className="c2">Nigerian Studies, or the Religious and
      Political System of the Yoruba</span><span>, Cass Library of African
      Studies, General Studies, No. 48</span><span> (Dennett, 1968).</span></p>
      <p><span className="c2">The Religion of the
      Yorubas</span><span>&nbsp;(Lucas, 1948).</span></p>
      <p><span className="c2">The Sociology of the
      Yoruba</span><span>&nbsp;(Fadipe, 1970).</span></p>

      <h3>History</h3>
      <p><span className="c2">An Introduction to Western Nigeria: Its
      People, Culture, and System of Government</span><span>&nbsp;(Adedeji,
      1967).</span></p>
      <p><span className="c2">Chieftaincy Politics and Communal Identity
      in Western Nigeria, 1893-1951</span><span>, Journal of African History,
      vol. 44(2), pp. 383-302 (Vaughan, 2003).</span></p>
      <p><span className="c2">The History of the Yorubas: From the
      Earliest Times to the Beginning of the British
      Protectorate</span><span>&nbsp;(Johnson, 2001).</span></p>
      <p><span className="c2">The Ijebu of Western Nigeria: A Historical
      and Socio-Cultural Study</span><span>&nbsp;(Olubomehin ed.,
      2001).</span></p>
      <p><span className="c2">Themes in the History of the Ijebu and Remo
      of Western Nigeria</span><span>&nbsp;(Olubomehin ed., 2010).</span></p>
      <p><span className="c2">Sources of Yoruba History</span><span>,
      Oxford Studies of African Affairs (Biobaku, 1973).</span></p>
      <p><span className="c2">The Yoruba: History, Culture and
      Language</span><span>, J.F. Odunjo Memorial Lectures, Series No. 5
      (Olatunji ed., 1996).</span></p>

      <h3>Local Government and Administration</h3>
      <p><span className="c2">Local Administration in West
      Africa</span><span>, pp. 190-97 on The Western Region (Wraith,
      1972).</span></p>
      <p><span className="c2">Local and District Councils - Should They be
      Forgotten?</span><span>, Journal of Modern African Studies, vol. 13(2), pp.
      309-32 (Riley, 1975).</span></p>
      <p><span className="c2">Local Government and the Traditional Rulers
      in Nigeria</span><span>, ch. 4 on The Role of Traditional Rules in Local
      Government - Western Nigerian Experience in Historical Perspective
      (Aborisade ed., 1985).</span></p>
      <p><span className="c2">Local Government in Southern Nigeria: A
      Manual of Law and Procedure Under the Eastern Region Local Government Law,
      1955, and the Western Region Local Government Law,
      1952</span><span>&nbsp;(Harris, 1957).</span></p>
      <p><span className="c2">Local Government in Yoruba Towns: An
      Analysis of the Roles of Obas, Chiefs and Elected Councillors</span><span>,
      D.Phil. Thesis, Oxford University (Lloyd, 1958).</span></p>
      <p><span className="c2">Local Government System in Western Nigeria:
      A Comparative Evaluation Performance Under Civilian and Military
      Regimes</span><span>, Indian Journal of Political Science, vol. 36(2), pp.
      123-36 (Ajibola &amp; Oyejide, 1975).</span></p>
      <p><span className="c2">The Nigerian Local Government Administrative
      Practice and Management</span><span>&nbsp;(Oyewo, 1987).</span></p>
      <p><span className="c2">The Principles of Native Administration in
      Nigeria: Selected Documents, 1900-1947</span><span>&nbsp;(Kirk-Greene ed.,
      1965).</span></p>
      <p><span className="c2">The Reorganisation of Nigeria&rsquo;s
      Administration</span><span>, Journal of Modern African Studies, vol. 6(4),
      pp. 571-81 (Murray, 1968).</span></p>

      <h3>Geography</h3>
      <p><span className="c2">A Geography of Western
      Nigeria</span><span>&nbsp;(Grant, 1960).</span></p>
      <p><span className="c2">Nigeria and Western Nigeria
      Maps</span><span>&nbsp;(Harvard Map Collection, 1958-1973).</span></p>
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

// Layout components
var Navi = function (props) {
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
              <Link to="/research" activeClassName="active">Research</Link>
            </li>
            <li>
              <Link to="/about" activeClassName="active">About</Link>
            </li>
            <li>
              <Link to="/credits" activeClassName="active">Credits</Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
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

var MapLayout = React.createClass({
  getInitialState: function () {
    return {
      geo: {}
    }
  },

  render: function () {
    return (
      <div>
        <div id="map"></div>
        <div id="sidebar" className="container"></div>
      </div>
    );
  },

  componentDidUpdate: function () {
    console.log("componentDidUpdate");
    var self = this;
    mapboxgl.accessToken = 'pk.eyJ1IjoiZ2JoYXRuYWciLCJhIjoiY2lxbDMzeDdnMDAxcGVpa3ZqOWFtNTNpZyJ9.6zSnoYwnb85A8DS107TSnA';
    var map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/gbhatnag/ciql39wck0035bgm2dfj108tt',
      minZoom: 6.5,
      maxZoom: 10.5,
      center: [3.730036572237964, 7.02734800827244],
      zoom: 6.85
    });
    map.addControl(new mapboxgl.Navigation());
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

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
            coordinates: [4.6792929918997, 6.680544692240744]
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

var MainLayout = React.createClass({
  render: function () {
    return (
      <div>
        <Navi />
        <main className="container-fluid">
          {this.props.children}
        </main>
        <footer>
          <div className="well well-lg">
            <p><a className="noline" rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">
              <img alt="Creative Commons License"
                src="https://i.creativecommons.org/l/by-sa/4.0/88x31.png" />
            </a> &nbsp; <Link to="/">African Drumming Laws</Link>
              &nbsp;by <a href="http://revolutionari.es">The Revolutionaries</a>
              &nbsp;is licensed under a <a rel="license"
                  href="http://creativecommons.org/licenses/by-sa/4.0/">Creative
                  Commons Attribution-ShareAlike 4.0 International License</a>.
            </p>
          </div>
        </footer>
      </div>
    );
  }
});

ReactDOM.render((
  <Router history={browserHistory}>
    <Route component={MainLayout}>
      <Route path="/" component={MapLayout} />
      <Route path="/research" component={ResearchPg} />
      <Route path="/about" component={AboutPg} />
      <Route path="/credits" component={CreditsPg} />
      <Route path="/admin" component={AdminPg} />
      <Route path="/admin/drums" component={DrumsPg} />
      <Route path="/admin/councils" component={DrumsPg} />
      <Route path="/admin/laws" component={LawsPg} />
      <Route path="/admin/laws/:lawId" component={LawPg} />
    </Route>
  </Router>
), document.getElementById('root'));
