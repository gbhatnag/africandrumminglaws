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
var datacache = {};

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

// helper to convert text to title case (i.e. Title Case)
var toTitleCase = function (str) {
  return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
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
    console.log('LawsPg will mount, ReactFireMixin');
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
    console.log('LawPg will mount, ReactFireMixin');
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
      <h4 className="heading">{toTitleCase(council.fullname)}</h4>
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
  _ui: {},

  getInitialState: function () {
    return {
      council: {},
      drums: [],
      laws: []
    };
  },

  renderDrum: function (drum) {
    var drumLocation = {
      pathname: "/drums/" + drum.id,
      query: this.props.location.query
    };
    var thumb = drum.thumb ? drum.thumb : "/img/drums/unknown-th.jpg";
    return (
      <Link to={drumLocation} className='drum-item list-group-item clearfix' key={drum.id}>
        <div className="row">
          <div className="col-xs-4">
            <img src={thumb} className="drum-thumb" />
          </div>
          <div className="col-xs-8">
            <h4 className="list-group-item-heading">{Object.keys(drum.names)[0]}</h4>
            <p className="list-group-item-text">
              <strong>{displayPluralized('law', drum.law_mentions)}</strong> in&nbsp;
              {displayPluralized('council', drum.council_mentions)}
            </p>
          </div>
        </div>
      </Link>
    );
  },

  openLaw: function (law) {
    var lawPath = "https://africandrumminglaws.org" + law.pdfPath;
    this._ui.lawmodal.title.html(law.citation);
    this._ui.lawmodal.viewer.attr('src', lawPath);
    this._ui.lawmodal.body.append(this._ui.lawmodal.viewer);
    this._ui.lawmodal.download.attr('href', lawPath);
    this._ui.lawmodal.modal.modal('show');
  },

  renderLaw: function (law) {
    return (
      <a href="#" className={law.date_of_publication + " list-group-item law-item"} key={law.id} data-toggle="modal"
        data-target="#law-modal" onClick={this.openLaw.bind(this, law)}>
        <h4 className="list-group-item-heading">{toTitleCase(law.council)}</h4>
        <p className="list-group-item-text law-citation">{law.citation}</p>
      </a>
    );
  },

  render: function () {
    if ($.isEmptyObject(this.state.council)) {
      return (
        <p>Loading...</p>
      );
    } else {
      return (
        <div>
          <ul className="pager list-nav">
            <li className="previous"><Link to="/">&larr; Drums</Link></li>
          </ul>
          <div className="row">
            <div className="col-xs-12">
              <h2 className="text-center">{toTitleCase(this.state.council.name)}</h2>
              <p>
                The following <strong>{displayCount('law', this.state.laws.length)}</strong>:
              </p>
              <div className="list-group">
                {this.state.laws.map(this.renderLaw)}
              </div>
              <p>
                Controls the following <strong>{displayCount('drum', this.state.drums.length)}</strong>:
              </p>
              <div className="list-group">
                {this.state.drums.map(this.renderDrum)}
              </div>
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
    var drums = [];
    var laws = [];
    if (!$.isEmptyObject(council.drums)) {
      var drumIds = Object.keys(council.drums);
      drumIds.sort(function (a,b) {
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
      });
      drums = $.map(drumIds, function (drumId) {
        return datacache.drums[drumId];
      });
    }
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
      drums: drums,
      laws: laws
    });
  },

  componentWillMount: function () {
    console.log('CouncilItem will mount, datacache');
    var self = this;
    var councilId = self.props.params.councilId;
    if ($.isEmptyObject(datacache)) {
      console.log("CouncilItem cache miss");
      $(document).on("adl:datacached", function (ev) {
        console.log("CouncilItem cached callback");
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
    this.handleData(nextProps.params.councilId);
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
    this._ui.lawmodal.title.html(law.citation);
    this._ui.lawmodal.viewer.attr('src', lawPath);
    this._ui.lawmodal.body.append(this._ui.lawmodal.viewer);
    this._ui.lawmodal.download.attr('href', lawPath);
    this._ui.lawmodal.modal.modal('show');
  },

  renderLawRow: function (law) {
    return (
      <a href="#" className={law.date_of_publication + " list-group-item law-item"} key={law.id} data-toggle="modal"
        data-target="#law-modal" onClick={this.openLaw.bind(this, law)}>
        <h4 className="list-group-item-heading">{toTitleCase(law.council)}</h4>
        <p className="list-group-item-text law-citation">{law.citation}</p>
        <p className="list-group-item-text law-citation-shadow">{law.citation}</p>
      </a>
    );
  },

  render: function () {
    var drum = this.state.drum;
    if (!$.isEmptyObject(drum)) {
      var laws = this.state.laws;
      var img = drum.picture == "consult spreadsheet" ? '/img/drums/unknown.jpg' : drum.picture;
      var name = Object.keys(drum.names)[0];
      var listloc = {
        pathname: "/",
        query: this.props.location.query
      };
      return (
        <div className="drum-item-header">
          <ul className="pager list-nav">
            <li className="previous"><Link to={listloc}>&larr; Drums</Link></li>
          </ul>
          <div className="row">
            <div className="col-xs-12">
              <img className="img-responsive" src={img} />
              <h2 className="text-center">{name}</h2>
              <p className="list-group-item-text text-center">
                Controlled by&nbsp;
                <strong>{displayPluralized('law', drum.law_mentions)}</strong> in&nbsp;
                {displayPluralized('council', drum.council_mentions)}
              </p>
            </div>
          </div>
          <Filter location={this.props.location} listitems="laws" filterlabel="Filter" />
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

  componentWillMount: function () {
    console.log('DrumItem will mount, datacache');
    var self = this;
    var drumId = self.props.params.drumId;
    if ($.isEmptyObject(datacache)) {
      console.log("DrumItem attempted data load on empty cache");
      $(document).on("adl:datacached", function (ev) {
        console.log("DrumItem datacached callback");
        self.handleData(drumId);
      });
    } else {
      self.handleData(drumId);
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

  componentDidUpdate: function () {
    var self = this;
    var yr = self.props.location.query.yr;
    var $selected = $(".law-item");
    if (!yr || typeof(yr) == 'undefined' || yr == "all") {
      $selected.slideDown();
      yr = 'All';
    } else if (Filter.yearopts.indexOf(parseInt(yr)) == -1) {
      self.context.router.replace(self.props.location.path);
    } else {
      $selected = $(".law-item." + yr);
      $selected.slideDown();
      $(".law-item:not(." + yr + ")").slideUp();
    }
    $selected.each(function () {
      var $source = $('p.law-citation-shadow', this);
      var $target = $('p.law-citation', this);
      var highlighted = highlightText($source.html(), yr);
      $target.html(highlighted);
    });
    $("#filter-count").html($selected.length);
    Filter.selectYear(yr);
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
    var drumLocation = {
      pathname: "/drums/" + drum.id,
      query: this.props.location.query
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
              {displayPluralized('council', drum.council_mentions)}
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
        <Filter sort onSort={this.onSort} location={this.props.location} listitems="drums" filterlabel="Filter &amp; Sort" />
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

  onSort: function (mode) {
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
    drums.sort(this.compareByMentions);
    this.setState({
      drums: drums,
      filters: {
        numdrums: drums.length
      }
    });
  },

  componentWillMount: function () {
    console.log('DrumList will mount, datacache');
    var self = this;
    if ($.isEmptyObject(datacache)) {
      console.log("DrumList attempted data load on empty cache");
      $(document).on("adl:datacached", function (ev) {
        console.log("DrumList datacached callback");
        self.handleData();
      });
    } else {
      self.handleData();
    }
  },

  componentDidUpdate: function () {
    console.log('DrumList componentDidUpdate');
    var self = this;
    var yr = self.props.location.query.yr;
    var $selected = $(".drum-item");
    if (!yr || typeof(yr) == 'undefined' || yr == "all") {
      $selected.slideDown();
      yr = 'All';
    } else if (Filter.yearopts.indexOf(parseInt(yr)) == -1) {
      // unknown year
      self.context.router.replace('/');
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
    $("#filter-count").html($selected.length);
    Filter.selectYear(yr);
  }
});

// Layout components
var MapLayout = React.createClass({
  contextTypes: {
    router: React.PropTypes.object.isRequired
  },

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

  showLoading: function () {
    $("#loading-modal").modal({backdrop:'static'});
  },

  renderMap: function () {
    $("#loading-modal").modal('hide');
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
    map.repaint = true;
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
          "text-anchor": "bottom",
          "text-max-width": 20
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
        console.log("clicked at: " + ev.lngLat);
        var features = map.queryRenderedFeatures(ev.point, { layers: ['councils'] });
        if (features.length) {
          var feature = features[0];
          map.flyTo({center: feature.geometry.coordinates});
          showPopupForFeature(feature);
          popupmode = 'fixed';
          self.context.router.push('/councils/' + feature.properties.id);
        }
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
    console.log('MapLayout will mount, datacache');
    var self = this;
    if ($.isEmptyObject(datacache)) {
      console.log('MapLayout attempted data load on empty datacache');
      $(document).on("adl:datacached", function (ev) {
        console.log("MapLayout datacached callback");
        self.setState({
          geo: datacache.geo
        });
      });
    } else {
      self.setState({
        geo: datacache.geo
      });
    }
  },

  componentDidMount: function () {
    if (adlmap) {
      return;
    }
    if ($.isEmptyObject(this.state.geo)) {
      this.showLoading();
    } else  {
      this.renderMap();
    }
  },

  componentDidUpdate: function () {
    if (adlmap) {
      return;
    }
    console.log('map updated');
    this.renderMap();
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
                <Link to="/" className="text-meta">Western Nigeria</Link>
              </li>
              <li>
                <a href="#other" id="nav-other" onClick={this.handleModal} className="nav-modal">Other Countries</a>
              </li>
              <li>
                <a href="#about" id="nav-about" onClick={this.handleModal} className="nav-modal">About</a>
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
  },

  componentWillMount: function () {
    console.log('MainLayout will mount, getJSON');
    $.getJSON(app.options.databaseURL + "/.json", function (data) {
      datacache = {
        councils: data.councils,
        drums: data.drums,
        geo: data.geo,
        laws: data.laws
      };
      $(document).trigger("adl:datacached");
    });
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
