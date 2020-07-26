import React from 'react';
import { FormGroup, ControlLabel, FormControl, Button } from 'react-bootstrap';

export default class Menu extends React.Component {
  constructor(props) {
    super(props);
    this.initialFilled = 33;
  }

  renderOptions(start, end) {
    let result = [];
    for (let i = start; i < end; i++) {
      result.push(
        <option key={'option-' + i} value={String(i)}>
          {i}
        </option>
      );
    }
    return result;
  }
  render() {
    return (
      <div>
        <h5>Generate New</h5>
        <form>
          <FormGroup controlId='formControlsSelect'>
            <ControlLabel>Initial cells</ControlLabel>
            <FormControl
              className='difficulty-select'
              defaultValue={this.initialFilled}
              inputRef={(input) => (this.initialFilled = input)}
              componentClass='select'
              placeholder='select'
            >
              <option value='17'>Extreme</option>
              <option value='33'>Medium</option>
              <option value='50'>Beginner</option>
            </FormControl>
          </FormGroup>
        </form>
        <Button
          className='generate-btn'
          onClick={() => {
            this.props.onGenerate(this.initialFilled.value);
            this.props.startGame();
          }}
        >
          Generate
        </Button>
        <p className='instructions'>Select the number of initial cells, then click generate!</p>
      </div>
    );
  }
}
