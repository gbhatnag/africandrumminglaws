// Routing and app
var Router = ReactRouter.Router;
var Route = ReactRouter.Route;
var Link = ReactRouter.Link;
var browserHistory = ReactRouter.browserHistory;

// Forms and "models"
const t = TcombForm;
const Form = t.form.Form;
const SignatorySchema = t.struct({
  name: t.String,
  title: t.String,
  org: t.String
});
const LocationSchema = t.struct({
  lat: t.Number,
  lon: t.Number
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
  "revokes": t.maybe(t.list(t.String)),
  "signatories": t.maybe(t.list(SignatorySchema)),
  "location": LocationSchema,
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
      <Link to={"/laws/" + sanitizeCitation(law.citation)}
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
    this.context.router.push('/laws');
  },

  cancel: function () {
    this.context.router.push('/laws');
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

var DrumsPg = function (props) {
  return (
    <div>
      <p>Drum data coming soon to a browser near you.</p>
    </div>
  );
};

// Layout components
var Navi = function (props) {
  return (
    <nav className="navbar navbar-default navbar-fixed-top">
      <div className="container">
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
              <Link to="/drums" activeClassName="active">Drums</Link>
            </li>
            <li>
              <Link to="/laws" activeClassName="active">Laws</Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

var MainLayout = React.createClass({
  render: function () {
    return (
      <div>
        <Navi />
        <main className="container">
          {this.props.children}
        </main>
      </div>
    );
  }
});

ReactDOM.render((
  <Router history={browserHistory}>
    <Route component={MainLayout}>
      <Route path="/" component={HomePg} />
      <Route path="/drums" component={DrumsPg} />
      <Route path="/laws" component={LawsPg} />
      <Route path="/laws/:lawId" component={LawPg} />
    </Route>
  </Router>
), document.getElementById('root'));
