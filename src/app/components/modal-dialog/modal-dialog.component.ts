import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, Inject } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Chart } from 'chart.js';


@Component({
  selector: 'app-modal-dialog',
  templateUrl: './modal-dialog.component.html',
  styleUrls: ['./modal-dialog.component.scss']
})
export class ModalDialogComponent implements OnInit {
  title: String = '';
  currentCoinDetails: any;
  currentAmountOwned: any = '';
  form: FormGroup = this.fb.group({
    addorRemoveCoin: ['', [Validators.required]],
    // chartTimeFrame: ['h1']
  });
  plotPoints: any;
  milliSecondPerDayConst: number = 86400000;
  myChart: any;
  supply: any;
  volume: any;


  constructor(private fb: FormBuilder, private dialogRef: MatDialogRef<ModalDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any, private currencyPipe: CurrencyPipe) {
    this.title = data.data.type === 'Add' ? `Add ${data.data.Coin.name} to wallet` :
      data.data.type === 'Remove' ? `Remove ${data.data.Coin.name} from wallet` : `${data.data.Coin.name} Summary Details`;
  }

  ngOnInit(): void {
    if (this.data.data.type === 'Remove') this.currentAmountOwned = `Number of ${this.data.data.Coin.name} owned: ${this.data.data.Coin.amountOwned}`;

    if (this.data.data.type === 'Remove') {
      this.form.get('addorRemoveCoin')?.valueChanges.subscribe((value) => {
        if (value > this.data.data.Coin.amountOwned) this.form.get('addorRemoveCoin')?.setErrors({ 'invalidInput': true });
        else this.form.get('addorRemoveCoin')?.setErrors(null);
      })
    }

    if (this.data.data.type === 'Details') {
      this.currentCoinDetails = this.data?.data?.rawCoinDetails.filter((coin: any) => coin.name === this.data.data.Coin.name)[0];
      this.supply = parseFloat(this.currentCoinDetails.supply).toLocaleString();
      this.volume = parseFloat(this.currentCoinDetails.volumeUsd24Hr).toLocaleString();
      this.getCoinChartData(this.currentCoinDetails, 'h1');
    }
  }

  async getCoinChartData(coin: any, chartTimeFrame: any) {
    const timeFrame = chartTimeFrame === 'h1' ? 'm1' :
      chartTimeFrame === 'd1' ? 'h1' : 'd1';

    const currDate = Date.now();
    let prevTime = currDate;
    let legendTitle: any;

    switch(chartTimeFrame) {
      case 'h1':
        prevTime -=  (this.milliSecondPerDayConst/24);
        legendTitle = 'Last 60 Minutes';
        break;
      case 'd1':
        prevTime -= this.milliSecondPerDayConst;
        legendTitle = 'Last 24 Hours';
        break;
      case 'w1':
        prevTime -=  (this.milliSecondPerDayConst*8);
        legendTitle = 'Last 7 Days';
        break;
      case 'm1':
        prevTime -=  (this.milliSecondPerDayConst*31);
        legendTitle = 'Last 30 Days';
        break;
    }

    await fetch(`https:api.coincap.io/v2/assets/${coin.id}/history?interval=${timeFrame}&start=${prevTime}&end=${currDate}`).then(result => result.json()).then(data => {
      const plotPoints = data?.data;
      let labels: any = [];
      let prices: any = [];
      plotPoints.forEach((dataPoints: any) => {
        if (chartTimeFrame === 'h1' || chartTimeFrame === 'd1') {
          const date = new Date(dataPoints?.date).toLocaleString().split(',')[1];
          labels.push(date);
        } else {
          labels.push(dataPoints.date.split('T')[0]);
        }
        prices.push(parseFloat(dataPoints.priceUsd));
      });

      const chart: any = document?.getElementById('myChart') ;
      if (this.myChart) this.myChart.destroy();
      this.myChart = new Chart(chart, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
              label: legendTitle,
              data: prices,
              borderWidth: 1
          }]
      }

      });
    });
  }

  addOrRemoveFromWallet() {
    this.dialogRef.close(this.form.get('addorRemoveCoin')?.value);
  }

  close() {
    this.dialogRef.close();
  }

}

