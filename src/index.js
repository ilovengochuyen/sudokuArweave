import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import Board from './Board.js';
import Menu from './Menu.js';
import { Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.css';

import Arweave from 'arweave/web';
class Game extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      initial: 0,
      loggedIn: false,
      timeCounter: 0,
      start: false,
      openModal: true,
      change: false,
      name: 'Player',
      beginner: [],
      medium: [],
      extreme: [],
    };
    this.keyUpload = React.createRef();
    this.stopWatch = null;
  }

  async componentDidMount() {
    const arweave = Arweave.init({
      host: 'arweave.net',
      port: 443,
      protocol: 'https',
    });
    this.setState({ arweave: arweave });
    setInterval(() => {
      this.fetchRanks();
    }, 5000);
  }

  handleGeneration = (initial) => {
    this.setState({ initial: initial, change: !this.state.change });
  };

  uploadKey = async (e) => {
    let dataFile = e.target.files[0];
    const fileReader = new FileReader();
    fileReader.onloadend = async (e) => {
      const jwk = JSON.parse(fileReader.result);
      this.setState({ jwk: jwk });
      const arweave = this.state.arweave;
      if (arweave) {
        arweave.wallets.jwkToAddress(jwk).then(async (address) => {
          this.setState({ address: address, loggedIn: true });
        });
      }
    };
    if (dataFile) {
      fileReader.readAsText(dataFile);
    }
  };

  login = () => {
    this.keyUpload.current.click();
  };

  startGame = () => {
    if (!this.state.start) {
      this.setState({ timeCounter: 0, start: true });
      this.stopWatch = setInterval(() => {
        this.setState({ timeCounter: this.state.timeCounter + 1 });
      }, 1000);
    } else {
      this.setState({ timeCounter: 0 });
    }
  };

  endGame = () => {};

  submitScore = async () => {
    let unixTime = Math.round(new Date().getTime() / 1000);
    var tx = await this.state.arweave.createTransaction(
      {
        data: this.state.timeCounter.toString() + `&${this.state.name}`,
      },
      this.state.jwk
    );
    tx.addTag('App', 'arweave-sudoku');
    tx.addTag('Unix-Time', unixTime);
    tx.addTag('Type', 'score');
    tx.addTag('Rank', this.state.initial.toString());
    await this.state.arweave.transactions.sign(tx, this.state.jwk);
    this.setState({ start: false });
    clearInterval(this.stopWatch);
    let resp = await this.state.arweave.transactions.post(tx);
    console.log('Tx submission response', resp);
    alert('Submitting score');
  };

  fetchRanks = async () => {
    let beginnerQuery = {
      op: 'and',
      expr1: {
        op: 'equals',
        expr1: 'App',
        expr2: 'arweave-sudoku',
      },
      expr2: {
        op: 'equals',
        expr1: 'Rank',
        expr2: '50',
      },
      expr3: {
        op: 'equals',
        expr1: 'Type',
        expr2: 'score',
      },
    };
    let mediumQuery = {
      op: 'and',
      expr1: {
        op: 'equals',
        expr1: 'App',
        expr2: 'arweave-sudoku',
      },
      expr2: {
        op: 'equals',
        expr1: 'Rank',
        expr2: '33',
      },
      expr3: {
        op: 'equals',
        expr1: 'Type',
        expr2: 'score',
      },
    };
    let extremeQuery = {
      op: 'and',
      expr1: {
        op: 'equals',
        expr1: 'App',
        expr2: 'arweave-sudoku',
      },
      expr2: {
        op: 'equals',
        expr1: 'Rank',
        expr2: '17',
      },
      expr3: {
        op: 'equals',
        expr1: 'Type',
        expr2: 'score',
      },
    };
    let beginner = await this.fetchByQuery(beginnerQuery);
    let medium = await this.fetchByQuery(mediumQuery);
    let extreme = await this.fetchByQuery(extremeQuery);
    // console.log(beginner[0].name);
    this.setState({ beginner, medium, extreme });
  };

  fetchByQuery = async (query) => {
    let arweave = this.state.arweave;
    let tx_rows = [];
    if (arweave) {
      const res = await arweave.arql(query);
      tx_rows = await Promise.all(
        res.map(async (id, i) => {
          let tx_row = {};
          let tx;
          try {
            tx = await arweave.transactions.get(id);
          } catch (e) {
            return {};
          }
          let tx_owner = await arweave.wallets.ownerToAddress(tx.owner);

          tx_row['unixTime'] = '0';
          tx_row['type'] = null;
          tx.get('tags').forEach((tag) => {
            let key = tag.get('name', {
              decode: true,
              string: true,
            });
            let value = tag.get('value', {
              decode: true,
              string: true,
            });

            if (key === 'Unix-Time') tx_row['unixTime'] = parseInt(value);
            if (key === 'Type') tx_row['type'] = value;
          });
          let data = tx.get('data', { decode: true, string: true });
          data = data.split('&');
          tx_row['id'] = id;
          tx_row['value'] = parseInt(data[0]);
          tx_row['player'] = tx_owner;
          tx_row['name'] = data[1];
          return tx_row;
        })
      );
      tx_rows.sort((a, b) => {
        return a.value - b.value !== 0 ? a.value - b.value : a.unixTime - b.unixTime;
      });
      return tx_rows;
    }
  };

  renderMenu = () => {
    if (this.state.loggedIn) {
      return <Menu onGenerate={this.handleGeneration} startGame={this.startGame} />;
    } else {
      return (
        <div>
          <Button onClick={this.login.bind(this)}>Login</Button>
          <input
            type='file'
            onChange={this.uploadKey}
            style={{ display: 'none' }}
            ref={this.keyUpload}
          />
        </div>
      );
    }
  };

  renderTimer = () => {
    if (this.state.loggedIn) {
      return (
        <div>
          <h4 style={{ textAlign: 'center' }}>Name: {this.state.name}</h4>
          <h3 style={{ textAlign: 'center' }}>Timer: {this.state.timeCounter}</h3>
        </div>
      );
    }
  };

  handleClose = () => {
    this.setState({ openModal: false });
  };

  handleChange = (e) => {
    this.setState({ name: e.target.value });
  };

  render() {
    return (
      <div className='game'>
        <div className='game-board'>
          <div className='leaderboard'>
            <div className='container'>
              <h1>Leaderboard</h1>
              <div className='row'>
                <div className='name'>Beginner</div>
              </div>
              <div className='row'>
                {/* <span>Extreme</span> */}
                <div className='name'>
                  {this.state.beginner[0] ? this.state.beginner[0].name : ''}
                </div>
                <div className='score'>
                  {this.state.beginner[0] ? this.state.beginner[0].value : ''}
                </div>
              </div>

              <br />
              <br />

              <div className='row'>
                <div className='name'>Medium</div>
              </div>
              <div className='row'>
                <div className='name'>{this.state.medium[0] ? this.state.medium[0].name : ''}</div>
                <div className='score'>
                  {this.state.medium[0] ? this.state.medium[0].value : ''}
                </div>
              </div>

              <br />
              <br />

              <div className='row'>
                <div className='name'>Extreme</div>
              </div>
              <div className='row'>
                <div className='name'>
                  {this.state.extreme[0] ? this.state.extreme[0].name : ''}
                </div>
                <div className='score'>
                  {this.state.extreme[0] ? this.state.extreme[0].value : ''}
                </div>
              </div>
            </div>
          </div>
          {this.renderTimer()}
          <Board
            key={1}
            initial={this.state.initial}
            change={this.state.change}
            start={this.state.start}
            submitScore={this.submitScore}
          />
          <div>
            <label>
              Name:
              <br />
              <input
                type='text'
                value={this.state.name}
                onChange={(e) => {
                  this.handleChange(e);
                }}
              />
            </label>
          </div>
          <div className='game-menu'>
            <div className='game-menu'>{this.renderMenu()}</div>
          </div>
        </div>
      </div>
    );
  }
}

ReactDOM.render(<Game />, document.getElementById('root'));
