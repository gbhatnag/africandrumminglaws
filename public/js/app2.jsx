// Routing and app
var Router = ReactRouter.Router;
var Route = ReactRouter.Route;
var IndexRoute = ReactRouter.IndexRoute;
var Link = ReactRouter.Link;
var browserHistory = ReactRouter.browserHistory;
var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

const BASEFILTER = '/drums/all/n';

var app = firebase.initializeApp({
  apiKey: "AIzaSyBcbMGVPYSdgEi4WZhlxoyyR0-YqwCP0HM",
  authDomain: "africandrumminglaws.firebaseapp.com",
  databaseURL: "https://africandrumminglaws.firebaseio.com",
  storageBucket: "africandrumminglaws.appspot.com",
});

var ADLmap = {
  map: null,
  reset: function () {
    if (!this.map) return;
    this.map.setFilter('councils', ['has', 'id']);
  }
};
var datacache = {};
var urlcache = '';

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

// helpers to clean up citations
// i.e. "W.R.L.N. 13 of 1956" <--> "WRLN13of1956"
var sanitizeCitation = function (str) {
  return str.split('.').join('').split(' ').join('');
};
var explodeCitationId = function (id) {
  var parts = id.split('of');
  var auth = parts[0].slice(0,4);
  var num = parts[0].slice(4);
  auth = auth[0] + '.' + auth[1] + '.' + auth[2] + '.' + auth[3] + '.';
  return auth + ' ' + num + ' of ' + parts[1];
};

// helper to display pluralized labels
var displayPluralized = function (itemStr, collectionObj) {
  var i = Object.keys(collectionObj).length;
  var singular = i + ' ' + itemStr;
  return i > 1 ? singular + 's' : singular;
};
var displayCount = function (itemStr, count) {
  var singular = count + ' ' + itemStr;
  return count > 1 ? singular + 's' : singular;
};

// helper to highlight the given 'term' in the given source string
var highlightText = function (src_str, term) {
  term = term.replace(/(\s+)/,"(<[^>]+>)*$1(<[^>]+>)*");
  var pattern = new RegExp("("+term+")", "gi");
  src_str = src_str.replace(pattern, "<mark>$1</mark>");
  src_str = src_str.replace(/(<mark>[^<>]*)((<[^>]+>)+)([^<>]*<\/mark>)/,"$1</mark>$2<mark>$4");
  return src_str;
};

// cache the url we're currently at
var cacheUrl = function (path) {
  //console.log('click', path);
  urlcache = path;
};

/*
 * ADMIN SECTION
 */
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
    //console.log('LawsPg will mount, ReactFireMixin');
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
    // console.log('LawPg will mount, ReactFireMixin');
    // bind law
    if (this.props.params.lawId) {
      var ref = firebase.database().ref("/laws/" + this.props.params.lawId);
      this.bindAsObject(ref, "law");
    }
  }
});

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

// Static Pages
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
      <h4 className="heading">{council.name}</h4>
      <h5><strong>{council.numdrums} {drumtext}</strong> controlled</h5>
      <h5><strong>{council.numlaws} {lawtext}</strong> published</h5>
    </div>
  );
};

var ListLaw = React.createClass({
  render: function () {
    var law = this.props.law;
    var links = [];
    if (law.adopted_from) {
      var citations = law.adopted_from.map(function (id) {
        return explodeCitationId(id);
      });
      links.push("adopts " + citations.join(', '));
    }
    if (law.amends) {
      var citations = law.amends.map(function (id) {
        return explodeCitationId(id);
      });
      links.push("amends " + citations.join(', '));
    }
    if (law.revokes) {
      var citations = law.revokes.map(function (id) {
        return explodeCitationId(id);
      });
      links.push("revokes " + citations.join(', '));
    }
    links = links.join('; ');
    return (
      <button className={law.date_of_publication + " list-group-item law-deed clearfix"}
        onClick={this.props.onClick.bind(null, law)}>
        <img src={"https://africandrumminglaws.org" + law.thumbPath} className="law-thumb" />
        <div className="law-details">
          <h4 className="list-group-item-heading law-citation">Law {law.citation}</h4>
          <h4 className="list-group-item-heading law-citation-shadow">Law {law.citation}</h4>
          <p className="list-group-item-para">from <em>{law.council}</em></p>
          <p className="list-group-item-text">{links}</p>
        </div>
      </button>
    );
  }
});

var ListDrum = React.createClass({
  render: function () {
    var drum = this.props.drum;
    var drumLocation = this.props.basepath + '/drum/' + drum.id;
    var thumb = drum.thumb ? drum.thumb : "/img/drums/unknown-th.jpg";
    if (drum.yearsorted) {
      return (
        <Link to={drumLocation} id={'drum-'+drum.id} className={drum.yearsorted.join(' ') + ' drum-item list-group-item clearfix ' + this.props.addClass}>
          <img src={thumb} className="drum-thumb" />
          <div className="drum-details">
            <h4 className="list-group-item-heading">{Object.keys(drum.names)[0]}</h4>
            <p className="list-group-item-text">
              <strong>{displayPluralized('law', drum.law_mentions)}</strong> in&nbsp;
              {displayPluralized('council', drum.council_mentions)}
            </p>
            <p className="list-group-item-text small year-list">{drum.yearsorted.join(' ')}</p>
            <p className="list-group-item-text small year-list-shadow">{drum.yearsorted.join(' ')}</p>
          </div>
        </Link>
      );
    } else {
      return (
        <Link to={drumLocation} id={'drum-'+drum.id} className={'drum-item list-group-item clearfix ' + this.props.addClass}>
          <img src={thumb} className="drum-thumb" />
          <div className="drum-details">
            <h4 className="list-group-item-heading">{Object.keys(drum.names)[0]}</h4>
            <p className="list-group-item-text">
              <strong>{displayPluralized('law', drum.law_mentions)}</strong> in&nbsp;
              {displayPluralized('council', drum.council_mentions)}
            </p>
          </div>
        </Link>
      );
    }
  },

  componentDidMount: function () {
    var id = this.props.drum.id;
    $('#drum-' + id).hover(function (ev) {
      ADLmap.map.setFilter('councils', ['==', 'filter-'+id, true]);
    }, function (ev) {
      ADLmap.reset();
    });
  }
});

var CouncilItem = React.createClass({
  _ui: {},

  getInitialState: function () {
    return {
      council: {},
      drums: [],
      laws: []
    };
  },

  getDrumcount: function () {
    if (this.state.council.drums) {
      return Object.keys(this.state.council.drums).length;
    } else {
      var revokes = false;
      this.state.laws.forEach(function (law) {
        if (law.revokes) {
          revokes = true;
        }
      });
      if (revokes) {
        return 0;
      } else {
        return 8;
      }
    }
  },

  renderDrum: function (drum) {
    return <ListDrum drum={drum} key={drum.id} basepath={this.props.basepath} addClass="indent" />;
  },

  openLaw: function (law) {
    var lawPath = "https://africandrumminglaws.org" + law.pdfPath;
    this._ui.lawmodal.title.html("Law " + law.citation);
    this._ui.lawmodal.viewer.attr('src', lawPath);
    this._ui.lawmodal.body.append(this._ui.lawmodal.viewer);
    this._ui.lawmodal.download.attr('href', lawPath);
    this._ui.lawmodal.modal.modal('show');
    return false;
  },

  renderLaw: function (law) {
    var drums = [];
    if (law.drums) {
      drums = law.drums.map(function (drum) {
        return datacache.drums[drum.drum_id];
      });
    } else {
      if (!law.revokes) {
        drums = datacache.mother.drums;
      }
    }
    drums.sort(function (a,b) {
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });
    return (
      <div key={law.id}>
        <ListLaw onClick={this.openLaw} law={law} />
        <div className="list-group">
          {drums.map(this.renderDrum)}
        </div>
      </div>
    );
  },

  render: function () {
    if ($.isEmptyObject(this.state.council)) {
      return (
        <p>Loading...</p>
      );
    } else {
      return (
        <div className="row">
          <div className="col-xs-12">
            <h2 className="text-center">{this.state.council.name}</h2>
            <h3 className="text-center">
              <span className="big badge">{displayCount('law', this.state.laws.length)}</span>
              &nbsp;controls <span className="big badge">{displayCount('drum', this.getDrumcount())}</span>
            </h3>
            <div className="list-group headspace">
              {this.state.laws.map(this.renderLaw)}
            </div>
          </div>
        </div>
      );
    }
  },

  handleData: function (councilId) {
    var council = datacache.councils[councilId];
    if (!council || typeof(council) == 'undefined') {
      alert("Whoops. We have a data issue for this council. Please try another one.");
      return;
    }
    var laws = [];
    if(!$.isEmptyObject(council.laws)) {
      var lawIds = Object.keys(council.laws);
      laws = $.map(lawIds, function (lawId) {
        return datacache.laws[lawId];
      });
      laws.sort(function (a,b) {
        var ayear = parseInt(a.date_of_publication);
        var byear = parseInt(b.date_of_publication);
        return ayear - byear;
      });
    }
    this.setState({
      council: council,
      laws: laws
    });
  },

  componentWillMount: function () {
    // console.log('CouncilItem will mount, datacache');
    var self = this;
    var councilId = self.props.councilId;
    if ($.isEmptyObject(datacache)) {
      // console.log("CouncilItem cache miss");
      $(document).on("adl:datacached", function (ev) {
        // console.log("CouncilItem cached callback");
        self.handleData(councilId);
      });
    } else {
      self.handleData(councilId);
    }
  },

  componentDidMount: function () {
    var self = this;
    self._ui.lawmodal = {};
    self._ui.lawmodal.modal    = $("#law-modal");
    self._ui.lawmodal.title    = $(".modal-title", self._ui.lawmodal.modal);
    self._ui.lawmodal.viewer   = $('<iframe id="law-viewer" src="" frameborder="0"></iframe>');
    self._ui.lawmodal.download = $("#law-download", self._ui.lawmodal.modal);
    self._ui.lawmodal.body     = $(".modal-body", self._ui.lawmodal.modal);
    self._ui.lawmodal.modal.on('hidden.bs.modal', function (ev) {
      self._ui.lawmodal.body.empty();
    });
  },

  componentWillReceiveProps: function (nextProps) {
    this.handleData(nextProps.councilId);
  }
});

var Filter = React.createClass({
  contextTypes: {
    router: React.PropTypes.object.isRequired
  },

  statics: {
    yearopts: [1956, 1958, 1959, 1960, 1961, 1962, 1963, 1964, 1965, 1967, 1968,
      1971, 1975],
    selectYear: function (yr) {
      var filteryear = $("#filter-year");
      if (filteryear.length == 0) return;
      $('option:contains(' + yr + ')', '#filter-year').prop('selected', true);
      $('#filter-year').trigger('chosen:updated');
    }
  },

  _ui: {},

  renderYearOption: function (yr) {
    return (
      <option key={yr} value={yr.toString()}>{yr}</option>
    );
  },

  render: function () {
    var sortby = {
      label: "",
      value: ""
    };
    if (this.props.sort) {
      sortby.label = <p className="text-right sortbylabel">Sort by:</p>;
      sortby.value = (
        <p>
          <select id="sortby">
            <option value="m">Most mentioned</option>
            <option value="a">Name: A-Z</option>
          </select>
        </p>
      );
    }
    return (
      <div id="filter-container">
        <div className="row">
          <div className="col-xs-12">
            <div id="filter-btn" className="btn btn-default btn-block text-info clearfix">
              <span className="pull-left"><span className="icon-filter"></span> {this.props.filterlabel}</span>
              <span className="pull-right"><span className="badge"><strong id="filter-count">-</strong></span> {this.props.listitems}</span>
            </div>
          </div>
        </div>
        <div id="filters" className="row">
          <div className="col-xs-4 filter-labels">
            <p className="text-right">From:</p>
            {sortby.label}
          </div>
          <div className="col-xs-8 filter-values">
            <p>
              <select id="filter-year">
                <option value="all">All Years</option>
                {Filter.yearopts.map(this.renderYearOption)}
              </select>
            </p>
            {sortby.value}
          </div>
        </div>
      </div>
    );
  },

  componentDidMount: function () {
    var self = this;
    self._ui.filterbtn  = $("#filter-btn");
    self._ui.filters    = $("#filters");
    self._ui.filteryear = $("#filter-year");
    self._ui.sortby     = $("#sortby");

    // convert to chosen and setup event handlers
    self._ui.filteryear.chosen({
      width:'180px',
      search_contains: true
    }).change(function (ev) {
      self.context.router.push({
        ...self.props.location,
        query: Object.assign({}, self.props.location.query, {yr:ev.target.value})
      });
    });
    self._ui.sortby.chosen({
      width:'180px',
      disable_search: true
    }).change(function (ev) {
      self.props.onSort(ev.target.value);
    });

    self._ui.filterbtn.click(function (ev) {
      self._ui.filters.slideToggle();
    });
  }
});

var DrumItem = React.createClass({
  _ui: {},

  getInitialState: function () {
    return {
      drum: {},
      laws: []
    };
  },

  openLaw: function (law) {
    var lawPath = "https://africandrumminglaws.org" + law.pdfPath;
    this._ui.lawmodal.title.html("Law " + law.citation);
    this._ui.lawmodal.viewer.attr('src', lawPath);
    this._ui.lawmodal.body.append(this._ui.lawmodal.viewer);
    this._ui.lawmodal.download.attr('href', lawPath);
    this._ui.lawmodal.modal.modal('show');
    urlcache = location.pathname;
    return false;
  },

  renderLawRow: function (law) {
    return <ListLaw onClick={this.openLaw} law={law} key={law.id} />;
  },

  render: function () {
    var drum = this.state.drum;
    if (!$.isEmptyObject(drum)) {
      var laws = this.state.laws;
      var img = drum.picture == "consult spreadsheet" ? '/img/drums/unknown.jpg' : drum.picture;
      var name = Object.keys(drum.names)[0];
      return (
        <div>
          <div className="drum-item-header">
            <div className="row">
              <div className="col-xs-12">
                <img className="img-responsive" src={img} />
                <h2 className="text-center">{name}</h2>
                <h3 className="text-center">{displayPluralized('law', drum.law_mentions)}</h3>
                <h3 className="text-center">{displayPluralized('council', drum.council_mentions)}</h3>
              </div>
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

  handleData: function (drumId) {
    var drum = datacache.drums[drumId];
    var citations = Object.keys(drum.law_mentions);
    var laws = [];
    citations.forEach(function (citation) {
      laws.push(datacache.laws[citation]);
    });
    this.setState({
      drum: drum,
      laws: laws.sort(function (a,b) {
        if (a.council.trim().toLowerCase() < b.council.trim().toLowerCase()) return -1;
        if (a.council.trim().toLowerCase() > b.council.trim().toLowerCase()) return 1;
        return 0;
      })
    });
  },

  filterMap: function () {
    // console.log('need to filter');
    if (ADLmap.map && ADLmap.map.loaded()) {
      // console.log('ready to filter');
      ADLmap.map.setFilter('councils', ['==', 'filter-' + this.props.drumId, true]);
    }
  },

  componentWillMount: function () {
    // console.log('DrumItem will mount, datacache');
    var self = this;
    var drumId = self.props.drumId;
    if ($.isEmptyObject(datacache)) {
      // console.log("DrumItem attempted data load on empty cache");
      $(document).on("adl:datacached", function (ev) {
        // console.log("DrumItem datacached callback");
        self.handleData(drumId);
      });
    } else {
      self.handleData(drumId);
    }
  },

  componentDidMount: function () {
    // console.log('DrumItem did mount');
    var self = this;
    self._ui.lawmodal = {};
    self._ui.lawmodal.modal    = $("#law-modal");
    self._ui.lawmodal.title    = $(".modal-title", self._ui.lawmodal.modal);
    self._ui.lawmodal.viewer   = $('<iframe id="law-viewer" src="" frameborder="0"></iframe>');
    self._ui.lawmodal.download = $("#law-download", self._ui.lawmodal.modal);
    self._ui.lawmodal.body     = $(".modal-body", self._ui.lawmodal.modal);
    self._ui.lawmodal.modal.on('hidden.bs.modal', function (ev) {
      self._ui.lawmodal.body.empty();
    });
    self.filterMap();
  },

  componentDidUpdate: function () {
    // console.log('DrumItem did update');
    var self = this;
    var yr = self.props.yr;
    var $selected = $(".law-deed");
    if (!yr || typeof(yr) == 'undefined' || yr == "all") {
      $selected.slideDown();
      yr = 'All';
    } else if (Filter.yearopts.indexOf(parseInt(yr)) == -1) {
      self.context.router.replace(self.props.location.path);
    } else {
      $selected = $(".law-deed." + yr);
      $selected.slideDown();
      $(".law-deed:not(." + yr + ")").slideUp();
    }
    $selected.each(function () {
      var $source = $('.law-citation-shadow', this);
      var $target = $('.law-citation', this);
      var highlighted = highlightText($source.html(), yr);
      $target.html(highlighted);
    });
    $("#filter-count").html($selected.length);
    self.filterMap();
  }
});

var LawList = React.createClass({
  contextTypes: {
    router: React.PropTypes.object.isRequired
  },

  _ui: {},

  getInitialState: function () {
    return {
      laws: []
    };
  },

  renderDrumItem: function (drum) {
    return <ListDrum drum={drum} key={drum.id} query={this.props.location.query} />;
  },

  render: function () {
    return (
      <div>
        <p>Laws list goes here</p>
      </div>
    );
  }
});

var DrumList = React.createClass({
  contextTypes: {
    router: React.PropTypes.object.isRequired
  },

  _ui: {},

  getInitialState: function () {
    return {
      drums: []
    };
  },

  renderDrumItem: function (drum) {
    return <ListDrum drum={drum} key={drum.id} basepath={this.props.basepath} />;
  },

  render: function () {
    return (
      <div className="sidebar-list">
        <h3 className="text-center" id="drumlist-count">{displayCount('drum', this.state.drums.length)}</h3>
        <div className="list-group">
          {this.state.drums.map(this.renderDrumItem)}
        </div>
      </div>
    );
  },

  compareByMentions: function (a,b) {
    return Object.keys(b.law_mentions).length - Object.keys(a.law_mentions).length;
  },

  compareByName: function (a,b) {
    var aname = Object.keys(a.names)[0];
    var bname = Object.keys(b.names)[0];
    if (aname < bname) return -1;
    if (aname > bname) return 1;
    return 0;
  },

  sort: function (mode) {
    // console.log('SORT MODE', mode);
    var drums = this.state.drums;
    if (mode == "a") {
      drums.sort(this.compareByName);
    } else {
      drums.sort(this.compareByMentions);
    }
    this.setState({
      drums: drums
    });
  },

  handleData: function () {
    var drums = $.map(datacache.drums, function (drum) {
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
    drums.sort(this.props.sb == 'n' ? this.compareByMentions : this.compareByName);
    this.setState({
      drums: drums
    });
  },

  updateDrumCount: function (count) {
    $("#drumlist-count").html(displayCount('drum', count));
  },

  componentWillMount: function () {
    // console.log('DrumList will mount, datacache');
    var self = this;
    if ($.isEmptyObject(datacache)) {
      // console.log("DrumList attempted data load on empty cache");
      $(document).on("adl:datacached", function (ev) {
        // console.log("DrumList datacached callback");
        self.handleData();
      });
    } else {
      self.handleData();
    }
    ADLmap.reset();
  },

  componentWillReceiveProps: function (nextProps) {
    // console.log('DrumList componentWillReceiveProps');
    this.sort(nextProps.sb);
  },

  componentDidUpdate: function () {
    // console.log('DrumList componentDidUpdate');
    var self = this;
    var yr = self.props.yr;
    var $selected = $(".drum-item");
    if (!yr || typeof(yr) == 'undefined' || yr == "all") {
      $selected.slideDown();
      yr = 'All';
    } else if (Filter.yearopts.indexOf(parseInt(yr)) == -1) {
      // unknown year
      self.context.router.replace(BASEFILTER);
    } else {
      $selected = $(".drum-item." + yr);
      $selected.slideDown();
      $(".drum-item:not(." + yr + ")").slideUp();
    }
    $selected.each(function () {
      var $source = $('p.year-list-shadow', this);
      var $target = $('p.year-list', this);
      var highlighted = highlightText($source.html(), yr);
      $target.html(highlighted);
    });
    self.updateDrumCount($selected.length);
  }
});

// Layout components
var Navi = React.createClass({
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
            <Link to={BASEFILTER} id="logomark" className="navbar-brand">
              <img src="/img/adl-logo-text.png" />
            </Link>
          </div>

          <div className="collapse navbar-collapse" id="adl-nav">
            <ul className="nav navbar-nav navbar-right">
              <li>
                <Link to="/about" onClick={cacheUrl.bind(this, this.props.path)} activeClassName="active">About</Link>
              </li>
              <li>
                <Link to="/bibliography" onClick={cacheUrl.bind(this, this.props.path)} activeClassName="active">Bibliography</Link>
              </li>
              <li>
                <Link to="/credits" onClick={cacheUrl.bind(this, this.props.path)} activeClassName="active">Credits</Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    );
  }
});

var Filters = React.createClass({
  contextTypes: {
    router: React.PropTypes.object.isRequired
  },

  statics: {
    yearopts: [1956, 1958, 1959, 1960, 1961, 1962, 1963, 1964, 1965, 1967, 1968,
      1971, 1975]
  },

  renderYearOption: function (yr) {
    return <option key={yr} value={yr.toString()}>{yr}</option>;
  },

  render: function () {
    return (
      <div id="filter-row" className="row">
        <div className="col-xs-3">
          <p className="text-center">
            Show:&nbsp;
            <select id="ls">
              <option value="drums">Drums</option>
              <option value="laws">Laws</option>
            </select>
          </p>
        </div>
        <div className="col-xs-3">
          <p className="text-center">
            From:&nbsp;
            <select id="yr">
              <option value="all">All Years</option>
              {Filter.yearopts.map(this.renderYearOption)}
            </select>
          </p>
        </div>
        <div className="col-xs-3">
          <p className="text-center">
            Sorted by:&nbsp;
            <select id="sb">
              <option value="n">Most mentioned</option>
              <option value="a">A-Z</option>
            </select>
          </p>
        </div>
        <div className="col-xs-3">
          <p className="text-center">
            In: <span className="chosen-container chosen-container-single"><span className="chosen-single override">Western Nigeria</span></span>
            <br />
            <Link to="/othercountries" onClick={cacheUrl.bind(this, this.props.path)}><small>SHOW OTHER COUNTRIES</small></Link>
          </p>
        </div>
      </div>
    );
  },

  syncSelections: function () {
    $("#ls").val(this.props.ls);
    $("#ls").trigger('chosen:updated');
    $("#yr").val(this.props.yr);
    $("#yr").trigger('chosen:updated');
    $("#sb").val(this.props.sb);
    $("#sb").trigger('chosen:updated');
  },

  componentDidMount: function () {
    var self = this;

    $("#ls").chosen({
      width:'130px',
      disable_search: true
    }).change(function (ev) {
      self.context.router.push('/' + ev.target.value + '/' + self.props.yr + '/' + self.props.sb);
    });

    $("#yr").chosen({
      width:'130px',
      search_contains: true
    }).change(function (ev) {
      self.context.router.push('/' + self.props.ls + '/' + ev.target.value + '/' + self.props.sb);
    });

    $("#sb").chosen({
      width:'130px',
      disable_search: true
    }).change(function (ev) {
      self.context.router.push('/' + self.props.ls + '/' + self.props.yr + '/' + ev.target.value);
    });

    // console.log('mount sync');
    self.syncSelections();
  },

  componentDidUpdate: function () {
    // console.log('up sync');
    this.syncSelections();
  }
});

var Sidebar = React.createClass({
  getInitialState: function () {
    return {
      maploaded: false
    };
  },

  render: function () {
    var self = this;
    var getContent = function () {
      if (!self.state.maploaded) return <h1></h1>
      if (self.props.it) {
        return (
          self.props.it == 'drum' ?
            <DrumItem yr={self.props.yr} drumId={self.props.id} />
            : <CouncilItem councilId={self.props.id} basepath={self.props.basepath} />
        );
      }
      return (
        self.props.ls == 'drums' ?
          <DrumList yr={self.props.yr} sb={self.props.sb} basepath={self.props.basepath} />
          : <LawList />);
    };
    return (
      <div id="sidebar" className="col-xs-4">
        {getContent()}
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
    );
  },

  componentWillMount: function () {
    var self = this;
    if (!self.state.maploaded) {
      $(document).on('adl:maploaded', function (ev) {
        // console.log('updating sidebar state', ADLmap.map.loaded());
        self.setState({maploaded: true});
      });
    }
  }
});

var App = React.createClass({
  contextTypes: {
    router: React.PropTypes.object.isRequired
  },

  loadMap: function () {
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
    map.repaint = false;
    ADLmap.map = map;

    var logPosition = function () {
      console.log("center: " + map.getCenter());
      console.log("zoom: " + map.getZoom());
    };

    map.on("load", function (ev) {
      map.addSource('wnprovinces', {
        type: 'geojson',
        data: datacache.geo.wnprovinces
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
        data: datacache.geo.wnborder
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
        data: datacache.geo.wnprovincelabels
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
          "text-anchor": "bottom",
          "text-max-width": 20
        },
        paint: {
          'text-color': 'rgba(207,207,207,1)'
        }
      });

      map.addSource('councils', {
        type: 'geojson',
        data: datacache.geo.councils
      });
      map.addLayer({
        id: 'councils',
        type: 'symbol',
        source: 'councils',
        layout: {
          'icon-image': 'circle-11',
          'icon-allow-overlap': true,
          'text-optional': true,
          'text-field': '{label}',
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
        closeButton: true,
        closeOnClick: false
      });
      var popupmode = 'hover';
      var popupDiv = document.getElementById('popup-div');
      popup.on('close', function (ev) {
        popupmode = 'hover';
      });
      var showPopupForFeature = function (feature) {
        ReactDOM.render(MapPopup(feature.properties), popupDiv);
        popup.setLngLat(feature.geometry.coordinates)
          .setHTML(popupDiv.innerHTML)
          .addTo(map);
      };

      map.on('mousemove', function (ev) {
        var features = map.queryRenderedFeatures(ev.point, { layers: ['councils'] });
        map.getCanvas().style.cursor = (features.length) ? 'pointer' : '';
        if (popupmode == 'fixed') {
          return;
        }
        if (!features.length) {
            popup.remove();
            return;
        }
        showPopupForFeature(features[0]);
      });

      map.on("click", function (ev) {
        // logPosition();
        // console.log("clicked at: " + ev.lngLat);
        var features = map.queryRenderedFeatures(ev.point, { layers: ['councils'] });
        if (features.length) {
          var feature = features[0];
          map.flyTo({center: feature.geometry.coordinates});
          showPopupForFeature(feature);
          popupmode = 'fixed';
          self.context.router.push(self.getBasePath() + '/council/' + feature.properties.id);
        }
      });

      setTimeout(function () {
        $(document).trigger("adl:maploaded");
      }, 700);
    });
  },

  getBasePath: function () {
    return '/' + this.props.params.ls + '/' + this.props.params.yr + '/' + this.props.params.sb;
  },

  render: function () {
    var params = this.props.params;
    var ls = params.ls || 'drums';
    var yr = params.yr || 'all';
    var sb = params.sb || 'n';
    var it = params.it || null;
    var id = params.id || null;
    return (
      <div>
        <Navi path={this.props.location.pathname} />
        <Filters ls={ls} yr={yr} sb={sb} path={this.props.location.pathname} />
        <div className="row">
          <Sidebar ls={ls} yr={yr} sb={sb} it={it} id={id} basepath={this.getBasePath()} />
          <div id="map" className="col-xs-8"></div>
        </div>
      </div>
    )
  },

  showModal: function (modalId) {
    $("#" + modalId + "-modal").modal('show');
  },

  componentWillMount: function () {
    // console.log('params', this.props.params);
  },

  componentDidMount: function () {
    var self = this;
    if ($.isEmptyObject(self.props.params)) {
      self.context.router.replace(BASEFILTER);
    }

    if (self.props.route.modal) self.showModal(self.props.route.modal);
    $(".modal").on('hidden.bs.modal', function () {
      var path = urlcache || '/';
      self.context.router.replace(path);
    });

    $(document).on('adl:datacached', function () {
      self.loadMap();
    });
    // console.log('app mount');
  },

  componentDidUpdate: function () {
    if (this.props.route.modal) this.showModal(this.props.route.modal);
  }
});

var Viewport = React.createClass({
  render: function () {
    return (
      <div>
        <main className="container-fluid">
          {this.props.children}
        </main>
      </div>
    );
  },

  componentWillMount: function () {
    // console.log('Viewport will mount, getJSON');
    $.getJSON(app.options.databaseURL + "/.json", function (data) {
      var mother = {};
      mother.law = data.laws["WRLN13of1956"];
      mother.drums = mother.law.drums.map(function (drum) {
        return data.drums[drum.drum_id];
      });
      datacache = {
        councils: data.councils,
        drums: data.drums,
        geo: data.geo,
        laws: data.laws,
        mother: mother
      };
      $(document).trigger("adl:datacached");
    });
  },

  componentDidMount: function () {
    $(document).on("adl:maploaded", function (ev) {
      $("#splash").fadeOut(1000);
    });
  }
});

ReactDOM.render((
  <Router history={browserHistory}>
    <Route path="/" component={Viewport}>
      <IndexRoute component={App} />
      <Route path="/:ls/:yr/:sb" component={App} />
      <Route path="/:ls/:yr/:sb/:it/:id" component={App} />
      <Route path="/about" component={App} modal="about" />
      <Route path="/bibliography" component={App} modal="bibliography" />
      <Route path="/credits" component={App} modal="credits" />
      <Route path="/othercountries" component={App} modal="othercountries" />
      <Route path="/admin" component={AdminPg} />
      <Route path="/admin/drums" component={DrumsPg} />
      <Route path="/admin/councils" component={DrumsPg} />
      <Route path="/admin/laws" component={LawsPg} />
      <Route path="/admin/laws/:lawId" component={LawPg} />
    </Route>
  </Router>
), document.getElementById('root'));
